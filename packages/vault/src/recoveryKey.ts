/**
 * Recovery Key formatting/parsing — see docs/RECOVERY.md §2-3. The key
 * itself is generated with @kryvex/crypto's generateKey() (the same 256-bit
 * random primitive as the Vault Encryption Key) — no new key-generation
 * code needed here, only the human-transcribable text encoding.
 */

import { bytesToHex, hexToBytes } from "@kryvex/crypto";

const GROUP_SIZE = 4;
const EXPECTED_HEX_LENGTH = 64; // 32 bytes

// Same fixed, generic message precedent as itemCrypto.ts's
// DECRYPT_FAILURE_MESSAGE — never leak *why* parsing failed.
const INVALID_RECOVERY_KEY_MESSAGE = "Invalid recovery key.";

/** Uppercase hex, dash-grouped every 4 characters for reliable transcription. */
export function formatRecoveryKey(bytes: Uint8Array): string {
  const hex = bytesToHex(bytes).toUpperCase();
  const groups: string[] = [];
  for (let i = 0; i < hex.length; i += GROUP_SIZE) {
    groups.push(hex.slice(i, i + GROUP_SIZE));
  }
  return groups.join("-");
}

/** Inverse of formatRecoveryKey — tolerates whitespace/dashes/case; fails closed on anything else. */
export function parseRecoveryKey(input: string): Uint8Array {
  const hex = input.replace(/[\s-]/g, "").toLowerCase();
  if (hex.length !== EXPECTED_HEX_LENGTH || !/^[0-9a-f]+$/.test(hex)) {
    throw new Error(INVALID_RECOVERY_KEY_MESSAGE);
  }
  try {
    return hexToBytes(hex);
  } catch {
    throw new Error(INVALID_RECOVERY_KEY_MESSAGE);
  }
}
