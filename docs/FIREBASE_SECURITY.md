# Kryvex — Firebase Security

Status: Rules validated by emulator-based tests (`tests/security`,
`tests/auth`) through Phase 3. See also: [DATA_MODEL.md](./DATA_MODEL.md),
[SECURITY_THREAT_MODEL.md](./SECURITY_THREAT_MODEL.md).

## 1. Firestore layout

```
users/{uid}                          -> UserProfileDocument (non-secret account/profile)
users/{uid}/items/{itemId}           -> VaultItemDocument
users/{uid}/attachments/{attachmentId} -> AttachmentDocument
```

Scoping every collection under `users/{uid}` makes ownership checks a single
predicate (`request.auth.uid == uid`) rather than a per-document field
comparison, and makes accidental cross-user queries structurally impossible
(a query can't escape its own `uid` subtree).

## 2. Firestore rules (Phase 0 draft)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    function isValidItem(data) {
      return data.keys().hasAll(['id','ownerId','type','revision','updatedAt','createdAt','deleted','wrappedItemKey','encryptedData'])
        && data.ownerId == request.auth.uid
        && data.revision is int
        && data.revision >= 0;
    }

    match /users/{uid} {
      allow read: if isOwner(uid);
      // profile is created once at signup, updated only for settings/key-rotation fields
      allow create: if isOwner(uid);
      allow update: if isOwner(uid) && request.resource.data.uid == uid;
      allow delete: if false; // account deletion goes through the deletion flow (Cloud Function), not a direct client delete

      match /items/{itemId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && isValidItem(request.resource.data);
        // updates must be a strictly increasing revision (compare-and-swap; see SYNC_ENGINE.md)
        allow update: if isOwner(uid)
                      && isValidItem(request.resource.data)
                      && request.resource.data.revision == resource.data.revision + 1;
        allow delete: if false; // deletes are tombstones (update deleted=true), not hard deletes
      }

      match /attachments/{attachmentId} {
        allow read: if isOwner(uid);
        allow create: if isOwner(uid) && request.resource.data.ownerId == uid;
        allow update: if isOwner(uid)
                      && request.resource.data.ownerId == uid
                      && request.resource.data.revision == resource.data.revision + 1;
        allow delete: if false;
      }
    }
  }
}
```

Default-deny is implicit (Firestore rules deny anything not explicitly
allowed). Hard deletes are intentionally disallowed from the client — deletion
is modeled as a tombstone write (see SYNC_ENGINE.md) so that sync across
offline devices can distinguish "never existed" from "deleted after my last
sync." Actual data erasure (GC of tombstoned documents, account deletion) runs
server-side via a Cloud Function on a schedule / on explicit account-deletion
request, not via client-issued deletes.

## 3. Storage layout & rules

```
users/{uid}/attachments/{attachmentId}   -> encrypted blob
```

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/attachments/{attachmentId} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid
                   && request.resource.size < 50 * 1024 * 1024; // upper bound, tuned later
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

Storage deletes are allowed directly (unlike Firestore) because a Storage
object has no sync/versioning semantics of its own — the corresponding
Firestore `AttachmentDocument` tombstone is the source of truth for sync, and
the blob's deletion doesn't need conflict detection the way item content does.

## 4. App Check

Firebase App Check is enabled for both Firestore and Storage to reject traffic
that doesn't originate from a genuine Kryvex client build (web: reCAPTCHA
Enterprise/v3 provider; mobile: Play Integrity / App Attest). This is a
defense-in-depth measure against scripted abuse of the API surface — it is not
a substitute for the ownership rules above, since App Check attests to "a real
Kryvex client," not "this specific user."

## 5. Authentication assumptions

- Firestore/Storage rules trust `request.auth.uid` as set by Firebase
  Authentication; they do not re-verify identity themselves (that's Firebase
  Auth's job).
- Rules never trust any client-supplied field to assert ownership (`ownerId`
  is checked against `request.auth.uid`, never read back from the client as an
  identity claim without that check).
- No rule path ever depends on decrypting `encryptedData` — the server cannot
  and does not need to.

## 6. Cloud Functions

Kept minimal, per the build spec (§46). Anticipated uses only:

- **Account deletion**: a callable function (auth-gated, requires the caller's
  own uid) that deletes the `users/{uid}` profile doc, all `items` and
  `attachments` subcollection documents, and all Storage objects under
  `users/{uid}/attachments/`. Runs entirely on ciphertext/metadata — no
  decryption capability is added.
- **Tombstone garbage collection**: a scheduled function that purges
  `deleted: true` item/attachment documents past a retention window.
- **`getKdfParams`** (added Phase 2, implemented): a deliberately
  unauthenticated callable resolving the sign-in "prelogin" problem — see
  `docs/CRYPTOGRAPHIC_ARCHITECTURE.md` §4.1. Uses the Admin SDK (bypasses
  Firestore rules, so no rules change) to return only
  `{ kdfSalt, kdfParams }` for a given email, `null` for a non-existent or
  incomplete account. Never touches ciphertext, a password, or a derived
  key — the narrowest surface that solves the problem.
- Cloud Functions never receive a master password, a derived key, or plaintext
  vault content, and no function is ever added whose purpose is to decrypt
  user data server-side (see build spec §69 — no admin decrypt endpoint, ever).

## 7. Required security-rule test cases (Firebase Emulator, Phase 1/2)

- User A cannot read User B's `items`/`attachments`/profile document.
- User A cannot write to User B's subtree (create, update, or attempt a
  disguised update via a merge).
- Unauthenticated requests are rejected on every path.
- An item update with a non-incrementing (or decreasing, or skipped-oversized)
  `revision` is rejected.
- An item create missing required envelope fields is rejected.
- A client attempting a hard delete (`delete` op) on an item/attachment
  document is rejected.
- A client attempting to set `ownerId` to someone else's uid on create/update
  is rejected.
- Storage: User A cannot read/write/delete an object under User B's
  `attachments/` path.
- Storage: an over-size upload is rejected.
- App Check: a request without a valid App Check token is rejected once
  enforcement is turned on for the project.

These tests are implemented with `@firebase/rules-unit-testing` against the
local emulator in Phase 1, and re-run in CI on every change to `firestore.rules`
/ `storage.rules`.
