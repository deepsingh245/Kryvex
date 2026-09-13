/**
 * Hard-deletes tombstoned attachments past their retention window — the
 * attachment counterpart to tombstoneGc.ts (see docs/SYNC_ENGINE.md §5 and
 * docs/DATA_MODEL.md §3). Unlike an item tombstone, an attachment tombstone
 * also has a Storage blob to remove — the Storage delete runs first (a
 * missing/already-gone blob is not an error, since Storage deletes have no
 * conflict semantics of their own — see docs/FIREBASE_SECURITY.md §3),
 * then the Firestore document is hard-deleted.
 *
 * Admin SDK (bypasses Firestore rules — same precedent getKdfParams.ts /
 * tombstoneGc.ts already established for admin-privileged functions).
 * Touches only envelope metadata (deleted/updatedAt/storagePath/the
 * document reference) — never reads or writes `wrappedAttachmentKey`/
 * `encryptedData`/`encryptedFileName` contents, consistent with this
 * codebase's index.ts header comment ("never touches vault ciphertext or
 * key material").
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { retentionCutoff } from "./tombstoneGc";

async function deleteStorageBlobIfPresent(storagePath: string): Promise<void> {
  try {
    await getStorage().bucket().file(storagePath).delete();
  } catch {
    // Already gone (e.g. a previous run's retry) — not an error; the
    // Firestore doc's hard-delete below is what actually matters.
  }
}

// Exported for unit testing only, same split as tombstoneGc.ts's
// retentionCutoff — a doc missing storagePath (shouldn't happen given
// isValidAttachment, but defensive) is simply skipped rather than passed
// to a Storage delete call with an empty path.
export function storagePathsOf(
  docs: { storagePath?: string | undefined }[],
): string[] {
  return docs
    .map((d) => d.storagePath)
    .filter((path): path is string => Boolean(path));
}

export const attachmentGc = onSchedule("every 24 hours", async () => {
  const firestore = getFirestore();
  const cutoff = Timestamp.fromDate(retentionCutoff(new Date()));

  const snap = await firestore
    .collectionGroup("attachments")
    .where("deleted", "==", true)
    .where("updatedAt", "<", cutoff)
    .get();

  if (snap.empty) return;

  const storagePaths = storagePathsOf(
    snap.docs.map((d) => d.data() as { storagePath?: string }),
  );
  for (const storagePath of storagePaths) {
    await deleteStorageBlobIfPresent(storagePath);
  }

  const batch = firestore.batch();
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
});
