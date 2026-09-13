/**
 * Attachment document schema — mirrors docs/DATA_MODEL.md §3 and
 * @kryvex/types/attachment.ts. Validates the plaintext Firestore envelope
 * read back before trusting it structurally, same "never trust data
 * structurally" precedent vaultItemDocumentSchema already follows.
 */

import { z } from "zod";
import { encryptedEnvelopeSchema } from "./vaultItem";

export const attachmentDocumentSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  itemId: z.string().min(1),
  revision: z.number().int().nonnegative(),
  updatedAt: z.unknown(),
  deleted: z.boolean(),
  wrappedAttachmentKey: encryptedEnvelopeSchema,
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  storagePath: z.string().min(1),
  encryptedFileName: encryptedEnvelopeSchema.optional(),
});

export type AttachmentDocumentInput = z.infer<typeof attachmentDocumentSchema>;
