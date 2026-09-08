/**
 * users/{uid} profile document reads/writes. Returns `unknown` from
 * Firestore — this package never trusts data structurally; the caller
 * validates it (see @kryvex/validation) before treating it as a
 * UserProfileDocument. See docs/DATA_MODEL.md §4.
 */

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

export async function createUserProfileDocument(
  firestore: Firestore,
  uid: string,
  data: Record<string, unknown>,
): Promise<void> {
  await setDoc(doc(firestore, "users", uid), {
    uid,
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function fetchUserProfileDocument(
  firestore: Firestore,
  uid: string,
): Promise<unknown | undefined> {
  const snap = await getDoc(doc(firestore, "users", uid));
  return snap.exists() ? snap.data() : undefined;
}
