/**
 * Platform-agnostic per-ItemType field metadata driving the generic
 * ItemForm (see docs/DATA_MODEL.md §2). Deliberately has no icon glyphs —
 * only a semantic `iconName` key — so this stays importable from a future
 * React Native UI (Phase 4b) without pulling a web-only icon library into a
 * shared package.
 *
 * image/pdf/file are modeled here for forward compatibility but marked
 * `enabled: false`: attachment upload/storage is Phase 6
 * (docs/ARCHITECTURE.md), so their create flow is intentionally excluded
 * from apps/web's type picker until then.
 *
 * Not covered by this generic config (kept out of Phase 4's MVP form
 * scope, revisit if needed): IdentityContent.idNumbers and structured
 * address sub-fields beyond a single free-text summary — both are optional
 * fields, and the base title/tags/notes/customFields already give a way to
 * capture that information without a bespoke nested editor.
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
  | "codeList";

export interface ItemFieldConfig {
  key: string;
  label: string;
  kind: ItemFieldKind;
  required?: boolean | undefined;
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  login: "Login",
  secureNote: "Secure Note",
  identity: "Identity",
  card: "Card",
  pin: "PIN",
  apiKey: "API Key",
  recoveryCodes: "Recovery Codes",
  image: "Image",
  pdf: "PDF",
  file: "File",
  custom: "Custom",
};

export const ITEM_TYPE_ICON_NAMES: Record<ItemType, string> = {
  login: "key",
  secureNote: "note",
  identity: "user",
  card: "credit-card",
  pin: "grid",
  apiKey: "code",
  recoveryCodes: "shield",
  image: "image",
  pdf: "file-text",
  file: "file",
  custom: "sliders",
};

// image/pdf/file are excluded from creation until Phase 6 builds
// attachment storage — see this file's header comment.
export const ITEM_TYPE_ENABLED: Record<ItemType, boolean> = {
  login: true,
  secureNote: true,
  identity: true,
  card: true,
  pin: true,
  apiKey: true,
  recoveryCodes: true,
  image: false,
  pdf: false,
  file: false,
  custom: true,
};

export const ITEM_TYPE_FIELD_CONFIG: Record<ItemType, ItemFieldConfig[]> = {
  login: [
    { key: "username", label: "Username", kind: "text" },
    { key: "password", label: "Password", kind: "secret", required: true },
    { key: "websites", label: "Websites", kind: "multiUrl" },
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
  image: [{ key: "attachmentId", label: "Image", kind: "text" }],
  pdf: [{ key: "attachmentId", label: "PDF", kind: "text" }],
  file: [{ key: "attachmentId", label: "File", kind: "text" }],
  custom: [],
};
