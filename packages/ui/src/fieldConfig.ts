/**
 * Platform-agnostic per-ItemType field metadata driving the generic
 * ItemForm (see docs/DATA_MODEL.md §2). Deliberately has no icon glyphs —
 * only a semantic `iconName` key — so this stays importable from a future
 * React Native UI (Phase 4b) without pulling a web-only icon library into a
 * shared package.
 *
 * image/pdf/file are now enabled (Phase 6) but have an EMPTY fixed-field
 * list here: `attachmentId` is an internal reference, never user-edited
 * text, so it's not part of the generic ItemForm at all — the Add flow uses
 * a dedicated upload component (AttachmentUploadForm) instead of ItemForm,
 * and the Edit flow reuses ItemForm for title/tags/customFields only
 * (no file replacement this phase — see PLAN.md's Phase 6 scope note).
 *
 * Not covered by this generic config (kept out of Phase 4's MVP form
 * scope, revisit if needed): IdentityContent.idNumbers and structured
 * address sub-fields beyond a single free-text summary — both are optional
 * fields, and the base title/tags/customFields already give a way to
 * capture that information without a bespoke nested editor.
 *
 * There is no standalone "Notes" field in the form (removed per product
 * feedback — too many fields to fill in for a quick entry): Custom Fields'
 * multiline option already covers free text. `ItemContentBase.notes`
 * itself stays in the type/schema (optional) so existing items that
 * already have notes keep them — see ItemForm.tsx's submit comment.
 */

import type { ItemType } from "@kryvex/types";

export type ItemFieldKind =
  | "text"
  | "secret"
  | "url"
  | "multiUrl"
  | "email"
  | "number"
  | "date"
  | "multiline"
  | "boolean"
  | "codeList"
  // Visible-by-default value with a Copy button but no reveal/hide toggle
  // (unlike "secret") — e.g. an email address that's worth copying but
  // isn't sensitive the way a password is. See CopyableTextField.tsx.
  | "copyText";

export interface ItemFieldConfig {
  key: string;
  label: string;
  kind: ItemFieldKind;
  required?: boolean | undefined;
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  login: "Login",
  email: "Email",
  secureNote: "Secure Note",
  identity: "Identity",
  card: "Card",
  pin: "PIN",
  apiKey: "API Key",
  recoveryCodes: "Recovery Codes",
  image: "Image",
  pdf: "PDF",
  file: "File",
  governmentId: "Government ID",
  custom: "Custom",
};

export const ITEM_TYPE_ICON_NAMES: Record<ItemType, string> = {
  login: "key",
  email: "mail",
  secureNote: "note",
  identity: "user",
  card: "credit-card",
  pin: "grid",
  apiKey: "code",
  recoveryCodes: "shield",
  image: "image",
  pdf: "file-text",
  file: "file",
  governmentId: "id-card",
  custom: "sliders",
};

export const ITEM_TYPE_ENABLED: Record<ItemType, boolean> = {
  login: true,
  email: true,
  secureNote: true,
  identity: true,
  card: true,
  pin: true,
  apiKey: true,
  recoveryCodes: true,
  image: true,
  pdf: true,
  file: true,
  governmentId: true,
  custom: true,
};

export const ITEM_TYPE_FIELD_CONFIG: Record<ItemType, ItemFieldConfig[]> = {
  login: [
    { key: "username", label: "Username", kind: "text" },
    { key: "password", label: "Password", kind: "secret", required: true },
    { key: "websites", label: "Websites", kind: "multiUrl" },
  ],
  // Deliberately minimal — just the two fields users actually asked for.
  email: [
    { key: "email", label: "Email", kind: "copyText", required: true },
    { key: "password", label: "Password", kind: "secret", required: true },
  ],
  secureNote: [{ key: "body", label: "Note", kind: "multiline" }],
  identity: [
    { key: "fullName", label: "Full name", kind: "text" },
    { key: "dateOfBirth", label: "Date of birth", kind: "date" },
    { key: "email", label: "Email", kind: "email" },
    { key: "phone", label: "Phone", kind: "text" },
  ],
  card: [
    { key: "cardholderName", label: "Cardholder name", kind: "text" },
    { key: "number", label: "Card number", kind: "secret", required: true },
    { key: "expiry", label: "Expiry (MM/YY)", kind: "text" },
    { key: "cvv", label: "CVV", kind: "secret" },
    { key: "pin", label: "PIN", kind: "secret" },
    { key: "brand", label: "Brand", kind: "text" },
  ],
  pin: [{ key: "value", label: "PIN", kind: "secret", required: true }],
  apiKey: [
    { key: "service", label: "Service", kind: "text", required: true },
    { key: "key", label: "Key", kind: "secret", required: true },
    { key: "token", label: "Token", kind: "secret" },
    { key: "endpoint", label: "Endpoint", kind: "url" },
  ],
  recoveryCodes: [
    { key: "service", label: "Service", kind: "text", required: true },
    { key: "codes", label: "Codes", kind: "codeList" },
  ],
  image: [],
  pdf: [],
  file: [],
  // No ItemForm-managed fixed fields — Title/Front/Back/Notes are handled
  // by the dedicated GovernmentIdUploadForm (Add flow) instead, same
  // precedent as image/pdf/file above. Notes is the one exception to this
  // file's "no standalone Notes field" rule (see GovernmentIdContent's own
  // doc comment in @kryvex/types) — that's handled directly in
  // ItemForm.tsx/GovernmentIdUploadForm.tsx, not via this config.
  governmentId: [],
  custom: [],
};
