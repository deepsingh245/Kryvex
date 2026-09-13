/**
 * Attachment document — see docs/DATA_MODEL.md §3. The plaintext Firestore
 * envelope for a file's metadata + wrapped DEK; the actual ciphertext blob
 * lives in Firebase Storage at `storagePath`, never inline here.
 */

import type { EncryptedEnvelope } from "./userProfile";

export interface AttachmentDocument {
  id: string; // client-generated UUID, immutable
  ownerId: string; // Firebase Auth uid, enforced by security rules
  itemId: string; // the owning VaultItemDocument's id
  revision: number; // monotonic, incremented on every write
  updatedAt: unknown; // Firestore Timestamp — see UserProfileDocument.createdAt
  deleted: boolean; // tombstone flag; retained, not hard-deleted, until GC
  wrappedAttachmentKey: EncryptedEnvelope; // this attachment's DEK, wrapped by the Vault Encryption Key
  mimeType: string; // plaintext: needed to render a preview UI without decrypting first
  sizeBytes: number; // plaintext: needed for quota/UX, non-sensitive
  storagePath: string; // Firebase Storage path to the encrypted blob
  encryptedFileName?: EncryptedEnvelope | undefined; // filename may be sensitive; encrypted
}
