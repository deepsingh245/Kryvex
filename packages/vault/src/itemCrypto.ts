/**
 * Per-item Data Encryption Key wrap/unwrap and content encrypt/decrypt —
 * see docs/DATA_MODEL.md §1 (wrappedItemKey/encryptedData) and
 * docs/CRYPTOGRAPHIC_ARCHITECTURE.md §2. Reuses @kryvex/crypto's generic
 * generateKey/encryptBytes/decryptBytes exactly as VaultProvider.tsx
 * already does for protectedVaultKey — no new crypto primitive needed.
 */

import { decryptBytes, encryptBytes, generateKey } from "@kryvex/crypto";
import type { EncryptedEnvelope, ItemContent } from "@kryvex/types";
import { itemContentSchema } from "@kryvex/validation";

// Same fixed, generic message VaultProvider.tsx already uses for a missing
// protectedVaultKey — never leak *why* decryption failed.
const DECRYPT_FAILURE_MESSAGE = "Unable to decrypt vault item.";

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/** Create-time only: generates a fresh per-item DEK and wraps it under the Vault Encryption Key. */
export function encryptItemContent(
  vaultEncryptionKey: Uint8Array,
  content: ItemContent,
): { wrappedItemKey: EncryptedEnvelope; encryptedData: EncryptedEnvelope } {
  const itemKey = generateKey();
  const wrappedItemKey = encryptBytes(vaultEncryptionKey, itemKey);
  const encryptedData = encryptBytes(
    itemKey,
    textBytes(JSON.stringify(content)),
  );
  return { wrappedItemKey, encryptedData };
}

/**
 * Edit-time only: unwraps the item's *existing* DEK and re-encrypts under
 * it rather than rotating per edit — keeps wrappedItemKey stable/unchanged
 * across edits. Reviewed in Phase 9w's security hardening pass and kept
 * as-is (not a live gap): AES-256-GCM's safety depends on never reusing a
 * nonce under a given key, not on how many times the key itself is used —
 * encryptBytes always draws a fresh CSPRNG nonce per call (see
 * packages/crypto/src/aead.ts), so repeated encryption under the same
 * per-item DEK is safe. See KRYVEX_SOURCE_OF_TRUTH.md §12's decisions log
 * for the full reasoning.
 */
export function reencryptItemContent(
  vaultEncryptionKey: Uint8Array,
  existingWrappedItemKey: EncryptedEnvelope,
  content: ItemContent,
): { encryptedData: EncryptedEnvelope } {
  let itemKey: Uint8Array;
  try {
    itemKey = decryptBytes(vaultEncryptionKey, existingWrappedItemKey);
  } catch {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
  const encryptedData = encryptBytes(
    itemKey,
    textBytes(JSON.stringify(content)),
  );
  return { encryptedData };
}

/**
 * Unwraps -> decrypts -> parses -> validates before returning. Any failure
 * (AEAD tag mismatch, malformed JSON, or a parsed object that doesn't match
 * itemContentSchema) throws one generic, fail-closed error — defense in
 * depth against a corrupted-but-AEAD-valid document, mirroring aead.ts's
 * own fixed-message philosophy. The caller never learns *why* it failed.
 */
export function decryptItemContent(
  vaultEncryptionKey: Uint8Array,
  wrappedItemKey: EncryptedEnvelope,
  encryptedData: EncryptedEnvelope,
): ItemContent {
  try {
    const itemKey = decryptBytes(vaultEncryptionKey, wrappedItemKey);
    const plaintextBytes = decryptBytes(itemKey, encryptedData);
    const json: unknown = JSON.parse(new TextDecoder().decode(plaintextBytes));
    return itemContentSchema.parse(json);
  } catch {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
}
