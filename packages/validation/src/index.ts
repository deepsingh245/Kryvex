/**
 * Boundary schemas — Firestore documents, decrypted item payloads — see
 * docs/DATA_MODEL.md, build spec §35 "never trust data received from
 * Firebase". Auth schemas since Phase 2, vault item schemas since Phase 4.
 * Sync envelope schemas remain Phase 5. `nonEmptyStringSchema` is a leftover
 * Phase 1 scaffold trivial schema, kept for compatibility.
 */

import { z } from "zod";

export const nonEmptyStringSchema = z.string().min(1);

export {
  emailSchema,
  masterPasswordSchema,
  signInFormSchema,
  signUpFormSchema,
} from "./auth";
export type { SignInFormInput, SignUpFormInput } from "./auth";

export {
  addressSchema,
  apiKeyContentSchema,
  cardContentSchema,
  customContentSchema,
  customFieldSchema,
  customFieldTypeSchema,
  encryptedEnvelopeSchema,
  fileContentSchema,
  identityContentSchema,
  imageContentSchema,
  itemContentBaseSchema,
  itemContentSchema,
  itemTypeSchema,
  loginContentSchema,
  pdfContentSchema,
  pinContentSchema,
  recoveryCodesContentSchema,
  secureNoteContentSchema,
  vaultItemDocumentSchema,
} from "./vaultItem";
export type {
  AddressInput,
  CustomFieldInput,
  ItemContentInput,
  VaultItemDocumentInput,
} from "./vaultItem";

export { passwordGeneratorOptionsSchema } from "./passwordGenerator";
export type { PasswordGeneratorOptionsInput } from "./passwordGenerator";

export { attachmentDocumentSchema } from "./attachment";
export type { AttachmentDocumentInput } from "./attachment";

export { userProfileSettingsSchema } from "./userProfile";
export type { UserProfileSettingsInput } from "./userProfile";
