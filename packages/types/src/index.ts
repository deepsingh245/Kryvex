/**
 * Domain types shared across the monorepo. Auth/profile types exist as of
 * Phase 2; vault item types (VaultItemDocument, ItemContent variants — see
 * docs/DATA_MODEL.md) as of Phase 4. AttachmentDocument (docs/DATA_MODEL.md
 * §3) as of Phase 6.
 */

export type { AuthenticatedUser } from "./auth";
export type {
  EncryptedEnvelope,
  KdfParams,
  UserProfileDocument,
  UserProfileSettings,
} from "./userProfile";
export type { AttachmentDocument } from "./attachment";
export {
  ITEM_TYPES,
  type Address,
  type ApiKeyContent,
  type AttachmentItemContent,
  type CardContent,
  type CustomField,
  type CustomFieldType,
  type CustomItemContent,
  type IdentityContent,
  type ItemContent,
  type ItemContentBase,
  type ItemType,
  type LoginContent,
  type PinContent,
  type RecoveryCodesContent,
  type SecureNoteContent,
  type VaultItemDocument,
} from "./vaultItem";

export interface KryvexPhaseMarker {
  readonly phase: number;
  readonly label: string;
}

export const PHASE_1_MARKER: KryvexPhaseMarker = {
  phase: 1,
  label: "foundation-scaffold",
};

declare const brand: unique symbol;

/** Nominal typing helper for future branded IDs (e.g. ItemId, UserId). */
export type Brand<T, B extends string> = T & { readonly [brand]: B };
