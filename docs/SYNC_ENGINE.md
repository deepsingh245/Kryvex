# Kryvex — Sync Engine

Status: Phase 0 draft. See also: [DATA_MODEL.md](./DATA_MODEL.md),
[FIREBASE_SECURITY.md](./FIREBASE_SECURITY.md).

## 1. Goals

- Multiple devices (web, iOS, Android) can read/write the same vault.
- The app is useful offline; changes made offline sync once connectivity
  returns.
- Conflicting concurrent edits are **never silently overwritten** — the build
  spec is explicit on this point (§69).
- The server never resolves conflicts by inspecting content, since it cannot
  decrypt it — conflict detection is metadata-only (revision numbers,
  timestamps), and resolution is a client-side, user-facing operation.

## 2. Identifiers

- Every item and attachment gets a client-generated UUID (v4) at creation
  time. IDs are never server-assigned, so a device can create records fully
  offline and sync them later without a round-trip to obtain an ID.

## 3. Revisions

- Every `VaultItemDocument`/`AttachmentDocument` carries an integer `revision`,
  starting at `0` on create and incremented by exactly `1` on every
  successful write.
- Firestore security rules enforce `revision == resource.data.revision + 1` on
  update (see FIREBASE_SECURITY.md §2) — this makes the write a
  **compare-and-swap**: a client can only successfully update a document if it
  last read the current revision. A stale client (one that read revision N
  while another device already wrote revision N+1) has its write rejected by
  the rule.

## 4. Timestamps

- `updatedAt`/`createdAt` are set client-side using Firestore server
  timestamps (`FieldValue.serverTimestamp()`) so devices with skewed clocks
  don't corrupt ordering. Timestamps are used for **display and tie-breaking
  UX** (e.g., "last edited 2 minutes ago," which version looks newer to a
  human resolving a conflict) — they are not the mechanism that prevents
  overwrites; the revision compare-and-swap is.

## 5. Deletion — tombstones, not hard deletes

- Deleting an item/attachment is a normal update: `deleted: true`,
  `revision += 1`. The document (envelope only — ciphertext content may be
  cleared/replaced with an empty placeholder at this point since it's no
  longer needed) persists so that other devices which sync less frequently can
  observe "this was deleted" rather than either re-uploading it (resurrecting
  a delete) or having no signal at all.
- Storage blobs for a deleted attachment are removed directly (Storage has no
  tombstone semantics of its own — see FIREBASE_SECURITY.md §3), driven by the
  client (or the scheduled Cloud Function GC) once the tombstone is confirmed
  synced.
- Tombstoned documents are garbage-collected (hard-deleted) after a retention
  window (default: 30 days) by a scheduled Cloud Function, giving offline
  devices a reasonable window to observe the tombstone before it disappears.

## 6. Sync flow (per device, per session)

```
1. Device comes online / app resumes.
2. Client subscribes to `users/{uid}/items` and `.../attachments` (Firestore
   real-time listeners), scoped by `updatedAt > lastSyncedAt` for incremental
   catch-up, falling back to a full listener for the live session.
3. For each incoming envelope:
   a. Validate the envelope schema (Zod) — never trust it structurally.
   b. If not present locally, or incoming revision > local revision: accept,
      decrypt, update local encrypted cache + in-memory/display state.
   c. If incoming revision == local revision: no-op (already synced).
   d. If local has unsynced pending changes AND incoming revision > the
      revision the local pending change was based on: CONFLICT (see §7).
4. For each locally pending change (created while offline or mid-edit):
   a. Attempt the write with the revision the client last observed.
   b. If the write succeeds (rule's compare-and-swap passes): mark synced.
   c. If the write is rejected (rule failure due to stale revision): CONFLICT
      (see §7) — re-fetch the current server document.
```

## 7. Conflict resolution

Kryvex does not attempt automatic field-level merging of encrypted content (it
cannot — the server-observable conflict is "two ciphertexts diverged from the
same base revision," and only the client can decrypt either to reason about
merging). Resolution is explicit and user-facing:

1. On detected conflict, the client decrypts both the local pending version
   and the server's current version.
2. The user is shown both (title/summary-level diff at minimum, full content
   where practical) and chooses: **keep mine**, **keep server's**, or (for
   structured items where it's unambiguous, e.g. distinct custom fields added
   on each side) **keep both as separate items**.
3. The chosen resolution is written as a new revision building on the
   server's current revision (so the compare-and-swap succeeds), never as a
   blind overwrite of whatever revision happens to be current.
4. Until resolved, the conflicting local change is kept in a local "pending
   conflicts" queue — it is not discarded and not silently merged.

This mirrors the build spec's requirement (§16): "Do not silently overwrite
data. Define a deterministic conflict-resolution strategy."

## 8. Attachment sync

- An `AttachmentDocument`'s envelope syncs like any other document (revision,
  tombstone, etc.).
- The encrypted blob itself is uploaded/downloaded independently via Firebase
  Storage, addressed by `storagePath`. A device only downloads the blob when
  the user actually opens/previews the attachment (lazy — see build spec §56
  performance guidance), not eagerly for every synced envelope.
- If an attachment's envelope syncs but the blob download fails/is deferred
  (offline), the item shows a "not yet downloaded" state rather than an error.

## 9. Offline behavior

- All reads/writes go through a local-first store: the UI always renders from
  the local encrypted cache + in-memory decrypted state, never blocks on
  network.
- Writes made offline are queued with an optimistic local `revision` bump and
  flushed in order once connectivity returns, following the sync flow in §6.
- The local cache stores ciphertext (envelopes) at rest; decryption happens
  on read into memory, consistent with CRYPTOGRAPHIC_ARCHITECTURE.md §7.

## 10. Corrupted / replayed data handling

- Any envelope that fails schema validation, fails AEAD decryption, or has an
  internally inconsistent revision/tombstone state is rejected and never
  displayed or merged into local state (see SECURITY_THREAT_MODEL.md #21/#22).
- A "replay" of an old ciphertext (e.g., a stale device pushing revision 3
  after revision 5 already exists) is rejected by the same compare-and-swap
  rule that handles ordinary conflicts — replay and conflict are the same
  mechanism at the protocol level.
