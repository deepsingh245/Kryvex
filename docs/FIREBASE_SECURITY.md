# Kryvex — Firebase Security

Status: Rules validated by emulator-based tests (`tests/security`,
`tests/auth`), extended through Phase 6 (`isValidAttachment` +
`tests/security/storage.rules.test.ts`, new this phase). §2's rule listing
below is illustrative — `firebase/firestore.rules` and
`firebase/storage.rules` are the deployed source of truth; this section is
kept in sync by hand. See also: [DATA_MODEL.md](./DATA_MODEL.md),
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

## 2. Firestore rules (matches `firebase/firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isOwner(uid) {
      return request.auth != null && request.auth.uid == uid;
    }

    function isValidItem(data) {
      return data.keys().hasAll(['id','ownerId','type','revision','updatedAt','createdAt','deleted','favorite','wrappedItemKey','encryptedData','attachmentRefs'])
        && data.ownerId == request.auth.uid
        && data.type in ['login','secureNote','identity','card','pin','apiKey','recoveryCodes','image','pdf','file','custom']
        && data.revision is int
        && data.revision >= 0
        && data.favorite is bool;
    }

    // Phase 6: same field-completeness rigor as isValidItem, applied to
    // the attachments subcollection (previously only ownerId-checked).
    function isValidAttachment(data) {
      return data.keys().hasAll(['id','ownerId','itemId','revision','updatedAt','deleted','wrappedAttachmentKey','mimeType','sizeBytes','storagePath'])
        && data.ownerId == request.auth.uid
        && data.revision is int
        && data.revision >= 0
        && data.sizeBytes is int
        && data.sizeBytes >= 0
        && data.mimeType is string;
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
        allow create: if isOwner(uid) && isValidAttachment(request.resource.data);
        allow update: if isOwner(uid)
                      && isValidAttachment(request.resource.data)
                      && request.resource.data.revision == resource.data.revision + 1;
        allow delete: if false; // hard delete only via the attachmentGc scheduled function
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
  Implemented as two functions sharing one retention helper:
  `firebase/functions/src/tombstoneGc.ts` (items, Phase 5) and
  `firebase/functions/src/attachmentGc.ts` (attachments, Phase 6 — also
  deletes the Storage blob at `storagePath` before the Firestore hard-delete,
  since an attachment tombstone leaves an orphaned blob that item tombstones
  don't have to worry about).
- **`getKdfParams`** (added Phase 2, implemented): a deliberately
  unauthenticated callable resolving the sign-in "prelogin" problem — see
  `docs/CRYPTOGRAPHIC_ARCHITECTURE.md` §4.1. Uses the Admin SDK (bypasses
  Firestore rules, so no rules change) to return only
  `{ kdfSalt, kdfParams }` for a given email, `null` for a non-existent or
  incomplete account. Never touches ciphertext, a password, or a derived
  key — the narrowest surface that solves the problem.
- **`getRecoveryEnvelope`** (added Phase 7w, implemented): the Recovery-Key
  counterpart to the same prelogin problem — see `docs/RECOVERY.md` §3.
  Same unauthenticated-callable, Admin-SDK, least-privilege shape as
  `getKdfParams`, returning only `{ protectedVaultKeyByRecovery }` (never
  `kdfSalt`/`protectedVaultKey`/anything else), `null` uniformly for
  "no such account," "profile incomplete," and "no recovery key was ever
  set up." Safe to leave unauthenticated: the returned ciphertext is
  useless without the Recovery Key itself, which the server never sees.
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
local emulator: `tests/security/firestore.rules.test.ts` (since Phase 1,
extended each phase — the `isValidAttachment` field-completeness cases were
added Phase 6) and `tests/security/storage.rules.test.ts` (new Phase 6 —
previously no Storage rule test existed despite `storage.rules` itself being
real since Phase 6's design). Both re-run in CI on every change to
`firestore.rules` / `storage.rules` via `pnpm test:security`.
