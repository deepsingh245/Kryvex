/**
 * Phase 1 scaffold. Real domain types (VaultItemDocument, ItemContent variants,
 * AttachmentDocument, UserProfileDocument — see docs/DATA_MODEL.md) land in
 * Phase 4. This package exists now so other packages can prove they resolve a
 * workspace dependency correctly before any real domain modeling happens.
 */

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
