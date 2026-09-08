/**
 * Phase 1 scaffold only. The real CSPRNG-based generator (build spec §11)
 * lands in Phase 4. This package exists now to prove it builds, lints,
 * typechecks, and is importable via `workspace:*` before any generation
 * logic is written. It must never use `Math.random()` once implemented —
 * see docs/SECURITY_THREAT_MODEL.md §7.
 */

export const PASSWORD_GENERATOR_PACKAGE_PHASE = "phase-1-scaffold" as const;

export function notYetImplemented(feature: string): never {
  throw new Error(
    `@kryvex/password-generator: "${feature}" is not implemented until Phase 4`,
  );
}
