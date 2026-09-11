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

/**
 * Merge-write onto an *existing* profile doc — unlike
 * createUserProfileDocument's plain (overwriting) setDoc, this never
 * clobbers fields it doesn't touch. Needed for future writes to an
 * already-created profile (e.g. key rotation re-wrapping protectedVaultKey
 * — see docs/CRYPTOGRAPHIC_ARCHITECTURE.md §8); not yet called by any flow
 * as of Phase 3, since signup writes protectedVaultKey in its initial
 * payload and unlock only reads.
 */
export async function updateUserProfileDocument(
  firestore: Firestore,
  uid: string,
  data: Record<string, unknown>,
): Promise<void> {
  await setDoc(doc(firestore, "users", uid), data, { merge: true });
}
