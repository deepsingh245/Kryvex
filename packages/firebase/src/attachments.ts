/**
 * users/{uid}/attachments/{attachmentId} reads/writes, plus the Storage
 * blob upload/download for the encrypted file content — see
 * docs/DATA_MODEL.md §3 and firebase/firestore.rules /
 * firebase/storage.rules. Returns/accepts `Record<string, unknown>` for the
 * Firestore envelope, same "never trust data structurally" precedent as
 * vaultItems.ts — the caller validates via @kryvex/validation's
 * attachmentDocumentSchema before treating a read as an AttachmentDocument.
 *
 * No hard-delete function: firestore.rules disallows it
 * (`allow delete: if false`) — softDeleteAttachmentDocument is the only
 * removal path; the actual Storage blob + Firestore doc are hard-deleted
 * only by the attachmentGc scheduled function after the retention window
 * (see firebase/functions/src/attachmentGc.ts).
 */

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import {
  getBytes,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";

// Matches firebase/storage.rules' upload size cap exactly — the same bound
// enforced server-side, applied here as getBytes' required max-size guard.
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

function attachmentDoc(
  firestore: Firestore,
  uid: string,
  attachmentId: string,
) {
  return doc(firestore, "users", uid, "attachments", attachmentId);
}

function attachmentStorageRef(
  storage: FirebaseStorage,
  uid: string,
  attachmentId: string,
) {
  return ref(storage, `users/${uid}/attachments/${attachmentId}`);
}

// createdAt/updatedAt-equivalent (updatedAt only, per AttachmentDocument's
// shape) is injected here, not trusted from the caller — same rationale as
// vaultItems.ts's createVaultItem.
export async function createAttachmentDocument(
  firestore: Firestore,
  uid: string,
  attachmentId: string,
  attachment: Record<string, unknown>,
): Promise<void> {
  await setDoc(attachmentDoc(firestore, uid, attachmentId), {
    ...attachment,
    updatedAt: serverTimestamp(),
  });
}

export async function fetchAttachmentDocument(
  firestore: Firestore,
  uid: string,
  attachmentId: string,
): Promise<Record<string, unknown> | undefined> {
  const snap = await getDoc(attachmentDoc(firestore, uid, attachmentId));
  return snap.exists() ? snap.data() : undefined;
}

export async function softDeleteAttachmentDocument(
  firestore: Firestore,
  uid: string,
  attachmentId: string,
  attachment: Record<string, unknown>,
): Promise<void> {
  await setDoc(attachmentDoc(firestore, uid, attachmentId), {
    ...attachment,
    deleted: true,
    updatedAt: serverTimestamp(),
  });
}

/** Uploads the already-encrypted (ciphertext) blob — never call with plaintext. */
export async function uploadAttachmentBlob(
  storage: FirebaseStorage,
  uid: string,
  attachmentId: string,
  ciphertext: Uint8Array,
): Promise<void> {
  await uploadBytes(
    attachmentStorageRef(storage, uid, attachmentId),
    ciphertext,
  );
}

/** Downloads the ciphertext blob — the caller decrypts it afterward. */
export async function downloadAttachmentBlob(
  storage: FirebaseStorage,
  uid: string,
  attachmentId: string,
): Promise<Uint8Array> {
  const bytes = await getBytes(
    attachmentStorageRef(storage, uid, attachmentId),
    MAX_ATTACHMENT_BYTES,
  );
  return new Uint8Array(bytes);
}
