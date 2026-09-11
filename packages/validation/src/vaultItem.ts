/**
 * Vault item schemas — mirrors docs/DATA_MODEL.md §1-2 and
 * @kryvex/types/vaultItem.ts. Used both to validate decrypted ItemContent
 * (Add/Edit form submission, post-decrypt defense-in-depth in
 * @kryvex/vault's decryptItemContent) and to validate the plaintext
 * envelope read back from Firestore before trusting it structurally (see
 * @kryvex/firebase/userProfile.ts's "never trust data structurally"
 * precedent, extended here to items).
 */

import { z } from "zod";
import { ITEM_TYPES } from "@kryvex/types";

export const itemTypeSchema = z.enum(ITEM_TYPES);

export const customFieldTypeSchema = z.enum([
  "text",
  "secret",
  "url",
  "email",
  "number",
  "date",
  "multiline",
  "boolean",
  "totp",
]);

export const customFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  type: customFieldTypeSchema,
  // booleans serialize as "true"/"false"; totp holds the raw secret — see
  // @kryvex/types's CustomField doc comment.
  value: z.string(),
});

export const addressSchema = z.object({
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

const itemContentBaseShape = {
  title: z.string().min(1, "Title is required."),
  tags: z.array(z.string()),
  notes: z.string().optional(),
  customFields: z.array(customFieldSchema),
};

export const itemContentBaseSchema = z.object(itemContentBaseShape);

export const loginContentSchema = z.object({
  ...itemContentBaseShape,
  type: z.literal("login"),
  username: z.string(),
  password: z.string(),
  websites: z.array(z.string()),
  totp: z
    .object({
      secret: z.string(),
      issuer: z.string().optional(),
      account: z.string().optional(),
    })
    .optional(),
});

export const secureNoteContentSchema = z.object({
  ...itemContentBaseShape,
  type: z.literal("secureNote"),
  body: z.string(),
});

export const identityContentSchema = z.object({
  ...itemContentBaseShape,
  type: z.literal("identity"),
  fullName: z.string().optional(),
  dateOfBirth: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  address: addressSchema.optional(),
  idNumbers: z.array(customFieldSchema).optional(),
});

export const cardContentSchema = z.object({
  ...itemContentBaseShape,
  type: z.literal("card"),
  cardholderName: z.string(),
  number: z.string(),
  expiry: z.string(),
  cvv: z.string(),
  pin: z.string().optional(),
  brand: z.string().optional(),
});

export const pinContentSchema = z.object({
  ...itemContentBaseShape,
  type: z.literal("pin"),
  value: z.string(),
});

export const apiKeyContentSchema = z.object({
  ...itemContentBaseShape,
  type: z.literal("apiKey"),
  service: z.string(),
  key: z.string(),
  token: z.string().optional(),
  endpoint: z.string().optional(),
});

export const recoveryCodesContentSchema = z.object({
  ...itemContentBaseShape,
  type: z.literal("recoveryCodes"),
  service: z.string(),
  codes: z.array(z.object({ code: z.string(), used: z.boolean() })),
});

// discriminatedUnion requires a single literal discriminant per member, so
// image/pdf/file each get their own schema rather than one z.enum(...)
// member (they share every other field).
function attachmentContentSchema<T extends "image" | "pdf" | "file">(type: T) {
  return z.object({
    ...itemContentBaseShape,
    type: z.literal(type),
    attachmentId: z.string().min(1),
  });
}

export const imageContentSchema = attachmentContentSchema("image");
export const pdfContentSchema = attachmentContentSchema("pdf");
export const fileContentSchema = attachmentContentSchema("file");

export const customContentSchema = z.object({
  ...itemContentBaseShape,
  type: z.literal("custom"),
});

export const itemContentSchema = z.discriminatedUnion("type", [
  loginContentSchema,
  secureNoteContentSchema,
  identityContentSchema,
  cardContentSchema,
  pinContentSchema,
  apiKeyContentSchema,
  recoveryCodesContentSchema,
  imageContentSchema,
  pdfContentSchema,
  fileContentSchema,
  customContentSchema,
]);

export const encryptedEnvelopeSchema = z.object({
  v: z.literal(1),
  alg: z.literal("AES-256-GCM"),
  nonce: z.string(),
  ciphertext: z.string(),
});

// Envelope-level only — does not (and cannot, without the Vault Encryption
// Key) validate encryptedData's plaintext contents. That happens after
// decryption, via itemContentSchema.
export const vaultItemDocumentSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().min(1),
  type: itemTypeSchema,
  revision: z.number().int().nonnegative(),
  updatedAt: z.unknown(),
  createdAt: z.unknown(),
  deleted: z.boolean(),
  favorite: z.boolean(),
  wrappedItemKey: encryptedEnvelopeSchema,
  encryptedData: encryptedEnvelopeSchema,
  attachmentRefs: z.array(z.string()),
});

export type CustomFieldInput = z.infer<typeof customFieldSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type ItemContentInput = z.infer<typeof itemContentSchema>;
export type VaultItemDocumentInput = z.infer<typeof vaultItemDocumentSchema>;
