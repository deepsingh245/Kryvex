/**
 * Domain types shared across the monorepo. Vault item types
 * (VaultItemDocument, ItemContent variants, AttachmentDocument — see
 * docs/DATA_MODEL.md) land in Phase 4; auth/profile types (below) exist as
 * of Phase 2.
 */

export type { AuthenticatedUser } from "./auth";
export type {
  EncryptedEnvelope,
  KdfParams,
  UserProfileDocument,
  UserProfileSettings,
} from "./userProfile";

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
