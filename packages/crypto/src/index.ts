/**
 * Phase 1 scaffold only. Real key derivation (Argon2id), authenticated
 * encryption (AES-256-GCM), HKDF stretching, and key wrapping land in
 * Phase 3 — see docs/CRYPTOGRAPHIC_ARCHITECTURE.md. This package exists now
 * to prove it builds, lints, typechecks, and is importable via
 * `workspace:*` before any cryptographic code is written.
 */

export const CRYPTO_PACKAGE_PHASE = "phase-1-scaffold" as const;

export function notYetImplemented(feature: string): never {
  throw new Error(
    `@kryvex/crypto: "${feature}" is not implemented until Phase 3`,
  );
}
