/**
 * Per-attachment Data Encryption Key wrap/unwrap and file content/filename
 * encrypt/decrypt — see docs/DATA_MODEL.md §3 and
 * docs/CRYPTOGRAPHIC_ARCHITECTURE.md §2. Reuses @kryvex/crypto's generic
 * generateKey/encryptBytes/decryptBytes exactly as itemCrypto.ts already
 * does for item content — no new crypto primitive needed. Whole-buffer only
 * (no chunking/streaming this phase — see PLAN.md's Phase 6 scope note),
 * bounded by firebase/storage.rules' 50MB cap.
 */

import {
  base64ToBytes,
  bytesToBase64,
  decryptBytes,
  encryptBytes,
  generateKey,
} from "@kryvex/crypto";
import type { EncryptedEnvelope } from "@kryvex/types";

// 96 bits, matching @kryvex/crypto/aead.ts's own NONCE_LENGTH exactly (see
// its docs/CRYPTOGRAPHIC_ARCHITECTURE.md §3 reference) — duplicated here
// (not exported by aead.ts) since it's only needed for the blob framing
// below, not the AEAD operation itself.
const NONCE_LENGTH = 12;

// Same fixed, generic message itemCrypto.ts uses — never leak *why*
// decryption failed.
const DECRYPT_FAILURE_MESSAGE = "Unable to decrypt vault attachment.";

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

/**
 * Create-time only: generates a fresh per-attachment DEK and wraps it under
 * the Vault Encryption Key. The same DEK encrypts both the file content and
 * the filename — everything belonging to this one attachment.
 */
export function encryptAttachment(
  vaultEncryptionKey: Uint8Array,
  fileBytes: Uint8Array,
  fileName: string,
): {
  wrappedAttachmentKey: EncryptedEnvelope;
  encryptedData: EncryptedEnvelope;
  encryptedFileName: EncryptedEnvelope;
} {
  const attachmentKey = generateKey();
  const wrappedAttachmentKey = encryptBytes(vaultEncryptionKey, attachmentKey);
  const encryptedData = encryptBytes(attachmentKey, fileBytes);
  const encryptedFileName = encryptBytes(attachmentKey, textBytes(fileName));
  return { wrappedAttachmentKey, encryptedData, encryptedFileName };
}

function unwrapAttachmentKey(
  vaultEncryptionKey: Uint8Array,
  wrappedAttachmentKey: EncryptedEnvelope,
): Uint8Array {
  try {
    return decryptBytes(vaultEncryptionKey, wrappedAttachmentKey);
  } catch {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
}

/** Unwraps the attachment's DEK and decrypts the file content. */
export function decryptAttachmentContent(
  vaultEncryptionKey: Uint8Array,
  wrappedAttachmentKey: EncryptedEnvelope,
  encryptedData: EncryptedEnvelope,
): Uint8Array {
  const attachmentKey = unwrapAttachmentKey(
    vaultEncryptionKey,
    wrappedAttachmentKey,
  );
  try {
    return decryptBytes(attachmentKey, encryptedData);
  } catch {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
}

/** Unwraps the attachment's DEK and decrypts the filename. */
export function decryptAttachmentFileName(
  vaultEncryptionKey: Uint8Array,
  wrappedAttachmentKey: EncryptedEnvelope,
  encryptedFileName: EncryptedEnvelope,
): string {
  const attachmentKey = unwrapAttachmentKey(
    vaultEncryptionKey,
    wrappedAttachmentKey,
  );
  try {
    return new TextDecoder().decode(
      decryptBytes(attachmentKey, encryptedFileName),
    );
  } catch {
    throw new Error(DECRYPT_FAILURE_MESSAGE);
  }
}

/**
 * Frames an EncryptedEnvelope as a raw binary blob (12-byte nonce, then
 * ciphertext — both base64-decoded) for Storage upload. `AttachmentDocument`
 * (docs/DATA_MODEL.md §3) has no field for the content envelope at all —
 * per its own doc comment, "the blob at storagePath ... is the raw
 * AES-256-GCM ciphertext of the file content" — so the nonce has to travel
 * inside the blob itself, not as Firestore metadata. Raw bytes (not a
 * base64 JSON envelope) so a large upload never pays bytesToBase64's
 * byte-loop cost on top of the one encryptBytes() already paid producing
 * the envelope in the first place.
 */
export function attachmentEnvelopeToBlob(
  envelope: EncryptedEnvelope,
): Uint8Array {
  const nonceBytes = base64ToBytes(envelope.nonce);
  const ciphertextBytes = base64ToBytes(envelope.ciphertext);
  const blob = new Uint8Array(nonceBytes.length + ciphertextBytes.length);
  blob.set(nonceBytes, 0);
  blob.set(ciphertextBytes, nonceBytes.length);
  return blob;
}

/** Inverse of attachmentEnvelopeToBlob — reconstructs the EncryptedEnvelope a downloaded Storage blob represents. */
export function blobToAttachmentEnvelope(blob: Uint8Array): EncryptedEnvelope {
  const nonceBytes = blob.slice(0, NONCE_LENGTH);
  const ciphertextBytes = blob.slice(NONCE_LENGTH);
  return {
    v: 1,
    alg: "AES-256-GCM",
    nonce: bytesToBase64(nonceBytes),
    ciphertext: bytesToBase64(ciphertextBytes),
  };
}
