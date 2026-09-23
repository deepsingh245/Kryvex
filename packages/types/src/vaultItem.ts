/**
 * Vault item types — see docs/DATA_MODEL.md §1-2. `VaultItemDocument` is the
 * plaintext Firestore envelope (server-visible); `ItemContent` variants are
 * the decrypted payload shape, never stored or transmitted in the clear.
 */

import type { EncryptedEnvelope } from "./userProfile";

export const ITEM_TYPES = [
  "login",
  "email",
  "secureNote",
  "identity",
  "card",
  "pin",
  "apiKey",
  "recoveryCodes",
  "image",
  "pdf",
  "file",
  "governmentId",
  "custom",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export type CustomFieldType =
  | "text"
  | "secret"
  | "url"
  | "email"
  | "number"
  | "date"
  | "multiline"
  | "boolean"
  | "totp";

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  // booleans serialize as "true"/"false"; totp holds the raw secret.
  value: string;
}

// Optional fields are typed `X | undefined` (not just `X`) throughout this
// file — required for structural compatibility with @kryvex/validation's
// zod schemas under tsconfig's exactOptionalPropertyTypes: zod's inferred
// type for `.optional()` always includes `| undefined` explicitly, whereas
// bare `field?: X` (without `| undefined`) forbids assigning an explicit
// `undefined` under that flag even though the key may be omitted.
export interface ItemContentBase {
  title: string;
  tags: string[];
  notes?: string | undefined;
  customFields: CustomField[];
}

// Not in docs/DATA_MODEL.md — IdentityContent.address references this shape
// without defining it there. Documented and added here; see §2 update in
// docs/DATA_MODEL.md.
export interface Address {
  line1: string;
  line2?: string | undefined;
  city?: string | undefined;
  state?: string | undefined;
  postalCode?: string | undefined;
  country?: string | undefined;
}

export interface LoginContent extends ItemContentBase {
  type: "login";
  username: string;
  password: string;
  // supports multiple URLs for autofill matching (see docs/AUTOFILL_ARCHITECTURE.md)
  websites: string[];
  // v1.5, schema reserved now
  totp?:
    | {
        secret: string;
        issuer?: string | undefined;
        account?: string | undefined;
      }
    | undefined;
}

export interface EmailContent extends ItemContentBase {
  type: "email";
  email: string;
  password: string;
}

export interface SecureNoteContent extends ItemContentBase {
  type: "secureNote";
  body: string;
}

export interface IdentityContent extends ItemContentBase {
  type: "identity";
  fullName?: string | undefined;
  dateOfBirth?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  address?: Address | undefined;
  // passport/SSN/etc modeled as typed custom fields
  idNumbers?: CustomField[] | undefined;
}

export interface CardContent extends ItemContentBase {
  type: "card";
  cardholderName: string;
  // full PAN — encrypted at rest like everything else; UI never
  // logs/displays it unmasked outside an explicit reveal action
  number: string;
  expiry: string; // MM/YY
  cvv: string;
  pin?: string | undefined;
  brand?: string | undefined;
}

export interface PinContent extends ItemContentBase {
  type: "pin";
  value: string;
}

export interface ApiKeyContent extends ItemContentBase {
  type: "apiKey";
  service: string;
  key: string;
  token?: string | undefined;
  endpoint?: string | undefined;
}

export interface RecoveryCodesContent extends ItemContentBase {
  type: "recoveryCodes";
  service: string;
  codes: { code: string; used: boolean }[];
}

export interface AttachmentItemContent extends ItemContentBase {
  type: "image" | "pdf" | "file";
  attachmentId: string; // references AttachmentDocument (Phase 6)
}

// Front is required (a passport's single page, a one-sided ID); back is
// optional (many license/ID cards are double-sided). Unlike
// AttachmentItemContent, this type also keeps a dedicated `notes` field
// visible in the form — a deliberate, one-off exception to every other
// type's "no standalone Notes field" (see fieldConfig.ts's header
// comment) since a government ID's free-text context (renewal reminders,
// etc.) doesn't fit neatly into a single Custom Field.
export interface GovernmentIdContent extends ItemContentBase {
  type: "governmentId";
  frontAttachmentId: string;
  backAttachmentId?: string | undefined;
}

export interface CustomItemContent extends ItemContentBase {
  type: "custom";
  // fully composed from customFields — no type-specific fixed fields
}

export type ItemContent =
  | LoginContent
  | EmailContent
  | SecureNoteContent
  | IdentityContent
  | CardContent
  | PinContent
  | ApiKeyContent
  | RecoveryCodesContent
  | AttachmentItemContent
  | GovernmentIdContent
  | CustomItemContent;

export interface VaultItemDocument {
  id: string; // client-generated UUID, immutable
  ownerId: string; // Firebase Auth uid, enforced by security rules
  type: ItemType; // needed for iconography/sorting without decryption
  revision: number; // monotonic, incremented on every write
  updatedAt: unknown; // Firestore Timestamp — see UserProfileDocument.createdAt
  createdAt: unknown;
  deleted: boolean; // tombstone flag; retained, not hard-deleted, until GC
  favorite: boolean; // plaintext by design — see docs/DATA_MODEL.md §1
  wrappedItemKey: EncryptedEnvelope; // this item's DEK, wrapped by the Vault Encryption Key
  encryptedData: EncryptedEnvelope; // AES-256-GCM ciphertext of ItemContent
  attachmentRefs: string[]; // attachment document IDs belonging to this item (may be empty)
}
