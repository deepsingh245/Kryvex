/**
 * AES-256-GCM content encryption and key wrapping — see
 * docs/CRYPTOGRAPHIC_ARCHITECTURE.md §3 for the envelope format and §11 for
 * the fail-closed tamper-handling requirements this implements.
 *
 * Deliberately generic (not "wrap a Vault Encryption Key"-specific):
 * encryptBytes/decryptBytes serve both content encryption and key wrapping
 * — mechanically the same AES-256-GCM operation applied to different
 * payloads, matching how CRYPTOGRAPHIC_ARCHITECTURE.md itself uses "wraps"
 * and "encrypts" for the same primitive.
 *
 * Pure-JS (@noble/ciphers, no WASM, no native module) — same constraint as
 * kdf.ts's Argon2id: apps/mobile is plain Expo Go, no `expo prebuild` yet.
 */

import { gcm } from "@noble/ciphers/aes.js";
import { randomBytes } from "@noble/hashes/utils.js";
import type { EncryptedEnvelope } from "@kryvex/types";

const NONCE_LENGTH = 12; // 96 bits, per docs/CRYPTOGRAPHIC_ARCHITECTURE.md §3
const KEY_LENGTH = 32; // AES-256

// Generic, deliberately opaque error — never leak *why* decryption failed
// (tag mismatch vs. corrupt nonce vs. unknown version all look the same to
// the caller). Matches docs/CRYPTOGRAPHIC_ARCHITECTURE.md §3's exact
// required message; see build spec §36 on not leaking details in errors.
const DECRYPT_FAILURE_MESSAGE = "Unable to decrypt vault item.";

/** A fresh random 256-bit key — used for both the Vault Encryption Key and, starting Phase 4, per-item/attachment Data Encryption Keys. */
export function generateKey(): Uint8Array {
  return randomBytes(KEY_LENGTH); // never Math.random() — see docs/SECURITY_THREAT_MODEL.md §7
}

export function encryptBytes(
  key: Uint8Array,
  plaintext: Uint8Array,
): EncryptedEnvelope {
  if (key.length !== KEY_LENGTH) {
    throw new Error("encryptBytes: key must be 32 bytes (AES-256).");
  }
  // @noble/ciphers/aes.js's gcm() appends the auth tag to its encrypt()
  // output rather than returning it separately — matches EncryptedEnvelope's
  // shape (no separate `tag` field).
  const nonce = randomBytes(NONCE_LENGTH);
  const ciphertext = gcm(key, nonce).encrypt(plaintext);
  return {
    v: 1,
    alg: "AES-256-GCM",
    nonce: bytesToBase64(nonce),
    ciphertext: bytesToBase64(ciphertext),
  };
}

export function decryptBytes(
  key: Uint8Array,
  envelope: EncryptedEnvelope,
): Uint8Array {
  if (envelope.v !== 1 || envelope.alg !== "AES-256-GCM") {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
  if (key.length !== KEY_LENGTH) {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
  let nonce: Uint8Array;
  let ciphertext: Uint8Array;
  try {
    nonce = base64ToBytes(envelope.nonce);
    ciphertext = base64ToBytes(envelope.ciphertext);
  } catch {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
  // @noble/ciphers only rejects nonces shorter than 8 bytes — it does NOT
  // enforce our spec's exact 96-bit requirement, so this must be checked
  // here (on both encrypt and decrypt paths; decrypt especially, since a
  // tampered/malformed envelope could carry a wrong-length nonce).
  if (nonce.length !== NONCE_LENGTH) {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
  try {
    return gcm(key, nonce).decrypt(ciphertext);
  } catch {
    // Tag mismatch or corrupt ciphertext — fail closed, never return
    // partial/garbage plaintext.
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
}

/**
 * Neither @noble/hashes nor @noble/ciphers exports base64 (only hex) — this
 * is the standard MDN byte-loop pattern rather than a new dependency.
 * Confirmed native btoa/atob support in Hermes since Expo SDK 51 (apps/mobile
 * is on 57). Loop, not `String.fromCharCode(...bytes)`, which risks a stack
 * overflow on large inputs (attachments, Phase 6).
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/** atob() throws on malformed input — fail-closed for free on a corrupt envelope field. */
export function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
