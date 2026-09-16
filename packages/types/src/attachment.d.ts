/**
 * Attachment document — see docs/DATA_MODEL.md §3. The plaintext Firestore
 * envelope for a file's metadata + wrapped DEK; the actual ciphertext blob
 * lives in Firebase Storage at `storagePath`, never inline here.
 */
import type { EncryptedEnvelope } from "./userProfile";
export interface AttachmentDocument {
    id: string;
    ownerId: string;
    itemId: string;
    revision: number;
    updatedAt: unknown;
    deleted: boolean;
    wrappedAttachmentKey: EncryptedEnvelope;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    encryptedFileName?: EncryptedEnvelope | undefined;
}
//# sourceMappingURL=attachment.d.ts.map