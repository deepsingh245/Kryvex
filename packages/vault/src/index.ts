/**
 * Phase 1 scaffold only. Real item CRUD and the lock state machine
 * (SIGNED_OUT / AUTHENTICATED_LOCKED / UNLOCKED — see docs/ARCHITECTURE.md
 * §2) land in Phase 2-4. This package exists now to prove it builds, lints,
 * typechecks, and correctly resolves its `@kryvex/types` workspace
 * dependency before any vault logic is written.
 */

import type { KryvexPhaseMarker } from "@kryvex/types";

export const VAULT_PACKAGE_PHASE: KryvexPhaseMarker = {
  phase: 1,
  label: "foundation-scaffold",
};

export function notYetImplemented(feature: string): never {
  throw new Error(
    `@kryvex/vault: "${feature}" is not implemented until Phase 4`,
  );
}
