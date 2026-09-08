/**
 * Phase 1 scaffold only. Real revision/tombstone/conflict-resolution logic
 * lands in Phase 5 — see docs/SYNC_ENGINE.md. This package exists now to
 * prove it builds, lints, typechecks, and correctly resolves its
 * `@kryvex/types` workspace dependency before any sync logic is written.
 */

import type { KryvexPhaseMarker } from "@kryvex/types";

export const SYNC_PACKAGE_PHASE: KryvexPhaseMarker = {
  phase: 1,
  label: "foundation-scaffold",
};

export function notYetImplemented(feature: string): never {
  throw new Error(
    `@kryvex/sync: "${feature}" is not implemented until Phase 5`,
  );
}
