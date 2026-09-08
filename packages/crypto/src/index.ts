export {
  DEFAULT_KDF_PARAMS,
  deriveAuthAndStretchedKey,
  deriveKdfMaterial,
  generateKdfSalt,
} from "./kdf";
export type { AuthAndStretchedKey, KdfParams } from "./kdf";

// Canonical byte<->hex encoding for anything stored as a string (e.g.
// kdfSalt in UserProfileDocument) — re-exported so every call site uses the
// same encoding instead of each reimplementing hex conversion.
export { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/**
 * AES-256-GCM item/attachment encryption and key wrapping land in Phase 3 —
 * see docs/CRYPTOGRAPHIC_ARCHITECTURE.md §2-3. Argon2id/HKDF (this
 * package's KDF module) already exist as of Phase 2.
 */
export function notYetImplemented(feature: string): never {
  throw new Error(
    `@kryvex/crypto: "${feature}" is not implemented until Phase 3`,
  );
}
