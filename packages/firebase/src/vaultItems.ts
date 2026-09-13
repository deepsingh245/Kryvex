/**
 * users/{uid}/items/{itemId} reads/writes — see docs/DATA_MODEL.md §1 and
 * firebase/firestore.rules. Returns/accepts `Record<string, unknown>`, same
 * "never trusts data structurally" precedent as userProfile.ts — the caller
 * validates via @kryvex/validation before treating a read as a
 * VaultItemDocument.
 *
 * No hard-delete function: firestore.rules disallows it
 * (`allow delete: if false`) — softDeleteVaultItem is the only removal
 * path, implemented as a plain update setting deleted:true, so there is
 * exactly one write code path to review for correctness against the rules'
 * compare-and-swap boundary.
 */

import {
  doc,
  collection,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore";

function itemsCollection(firestore: Firestore, uid: string) {
  return collection(firestore, "users", uid, "items");
}

/**
 * Real-time subscription — see docs/SYNC_ENGINE.md §6. `onSnapshot`'s own
 * initial-snapshot-then-live-updates behavior covers both "first load" and
 * "ongoing sync"; deliberately not building a separate
 * `updatedAt > lastSyncedAt` bootstrap query on top of it (see PLAN.md's
 * Phase 5 scope note) — simpler, revisit only if a real vault size makes
 * the initial full listener too slow.
 */
export function subscribeToVaultItems(
  firestore: Firestore,
  uid: string,
  onNext: (docs: Record<string, unknown>[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    itemsCollection(firestore, uid),
    (snap) => onNext(snap.docs.map((d) => d.data())),
    onError,
  );
}

// createdAt/updatedAt are injected here, not trusted from the caller —
// client clocks aren't a reliable source for fields firestore.rules'
// compare-and-swap logic depends on.
export async function createVaultItem(
  firestore: Firestore,
  uid: string,
  itemId: string,
  item: Record<string, unknown>,
): Promise<void> {
  await setDoc(doc(firestore, "users", uid, "items", itemId), {
    ...item,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Single-document re-fetch — used by the sync engine's retry-on-rejection
 * path (docs/SYNC_ENGINE.md §7): after a compare-and-swap write is
 * rejected, the caller needs the server's current document to build the
 * conflict record. Returns `undefined` if the document doesn't exist.
 */
export async function fetchVaultItem(
  firestore: Firestore,
  uid: string,
  itemId: string,
): Promise<Record<string, unknown> | undefined> {
  const snap = await getDoc(doc(firestore, "users", uid, "items", itemId));
  return snap.exists() ? snap.data() : undefined;
}

// Full-document setDoc (not merge) — firestore.rules' isValidItem() runs
// against the whole resulting document either way, and resending the
// complete object avoids any ambiguity about a partial merge leaving a
// stale field behind.
export async function updateVaultItem(
  firestore: Firestore,
  uid: string,
  itemId: string,
  item: Record<string, unknown>,
): Promise<void> {
  await setDoc(doc(firestore, "users", uid, "items", itemId), {
    ...item,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteVaultItem(
  firestore: Firestore,
  uid: string,
  itemId: string,
  item: Record<string, unknown>,
): Promise<void> {
  await updateVaultItem(firestore, uid, itemId, { ...item, deleted: true });
}
