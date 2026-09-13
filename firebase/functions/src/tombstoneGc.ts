/**
 * Hard-deletes tombstoned vault items past their retention window — see
 * docs/SYNC_ENGINE.md §5 ("tombstoned documents are garbage-collected after
 * a retention window (default: 30 days) by a scheduled Cloud Function").
 *
 * Admin SDK (bypasses Firestore rules — safe, same precedent
 * getKdfParams.ts already established for admin-privileged functions: see
 * its own header comment). Touches only envelope metadata
 * (deleted/updatedAt/the document reference) — never reads or writes
 * `encryptedData`/`wrappedItemKey` contents, consistent with this
 * codebase's index.ts header comment ("never touches vault ciphertext or
 * key material").
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const RETENTION_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Exported for unit testing only — same split getKdfParams.ts already
// uses: the real Admin SDK query/delete needs the emulator, covered
// separately (not by plain `pnpm test`).
export function retentionCutoff(
  now: Date,
  retentionDays: number = RETENTION_DAYS,
): Date {
  return new Date(now.getTime() - retentionDays * MS_PER_DAY);
}

export const tombstoneGc = onSchedule("every 24 hours", async () => {
  const firestore = getFirestore();
  const cutoff = Timestamp.fromDate(retentionCutoff(new Date()));

  const snap = await firestore
    .collectionGroup("items")
    .where("deleted", "==", true)
    .where("updatedAt", "<", cutoff)
    .get();

  if (snap.empty) return;

  const batch = firestore.batch();
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
  }
  await batch.commit();
});
