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
  getDocs,
  collection,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

function itemsCollection(firestore: Firestore, uid: string) {
  return collection(firestore, "users", uid, "items");
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

export async function fetchVaultItems(
  firestore: Firestore,
  uid: string,
): Promise<Record<string, unknown>[]> {
  const snap = await getDocs(itemsCollection(firestore, uid));
  return snap.docs.map((d) => d.data());
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
