/**
 * Password-based key derivation for Kryvex — see
 * docs/CRYPTOGRAPHIC_ARCHITECTURE.md §1-2 for the full key hierarchy and
 * §4.1 for how this feeds the prelogin/sign-in flow.
 *
 * Pure-JS Argon2id (no WASM, no native module) so this runs identically on
 * apps/web and apps/mobile (plain Expo Go, no `expo prebuild` yet — see
 * PLAN.md's Phase 7/10 scope). This is slower than a native/WASM binding;
 * that tradeoff is deliberate for now and documented in the Phase 2 plan —
 * revisit once native tooling lands.
 */

import { argon2idAsync } from "@noble/hashes/argon2.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, randomBytes } from "@noble/hashes/utils.js";

export interface KdfParams {
  memoryKiB: number;
  iterations: number;
  parallelism: number;
  version: number;
}

/**
 * Phase 2 default policy — not yet per-platform-tuned (mobile's pure-JS
 * Argon2id will be noticeably slower than web's at this cost). Revisit once
 * real devices can be benchmarked. Never rely on @noble/hashes' own default
 * (1 GiB memory) — always pass params explicitly.
 */
export const DEFAULT_KDF_PARAMS: KdfParams = {
  memoryKiB: 65536, // 64 MiB
  iterations: 3,
  parallelism: 1,
  version: 0x13,
};

/** Never Math.random() — see docs/SECURITY_THREAT_MODEL.md §7. */
export function generateKdfSalt(): Uint8Array {
  return randomBytes(16);
}

export async function deriveKdfMaterial(
  masterPassword: string,
  salt: Uint8Array,
  params: KdfParams,
): Promise<{ masterKey: Uint8Array }> {
  const masterKey = await argon2idAsync(masterPassword, salt, {
    t: params.iterations,
    m: params.memoryKiB,
    p: params.parallelism,
    version: params.version,
    dkLen: 32,
    asyncTick: 10,
  });
  return { masterKey };
}

// Distinct HKDF `info` strings provide domain separation between the two
// outputs of the same masterKey — see docs/CRYPTOGRAPHIC_ARCHITECTURE.md §2.
const STRETCH_INFO = new TextEncoder().encode("kryvex-stretch-v1");
const AUTH_INFO = new TextEncoder().encode("kryvex-firebase-auth-v1");

export interface AuthAndStretchedKey {
  /** Hex-encoded — sent to Firebase Auth as the account "password." Never the master password itself. */
  authSecret: string;
  /** Kept in memory only (see the UNLOCKED lock state) — wraps the Vault Encryption Key starting Phase 3. */
  stretchedMasterKey: Uint8Array;
}

export function deriveAuthAndStretchedKey(
  masterKey: Uint8Array,
): AuthAndStretchedKey {
  const stretchedMasterKey = hkdf(
    sha256,
    masterKey,
    undefined,
    STRETCH_INFO,
    32,
  );
  const authKeyBytes = hkdf(sha256, masterKey, undefined, AUTH_INFO, 32);
  return { authSecret: bytesToHex(authKeyBytes), stretchedMasterKey };
}
