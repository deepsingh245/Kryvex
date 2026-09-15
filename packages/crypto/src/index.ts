export {
  DEFAULT_KDF_PARAMS,
  deriveAuthAndStretchedKey,
  deriveKdfMaterial,
  generateKdfSalt,
} from "./kdf";
export type { AuthAndStretchedKey, KdfParams } from "./kdf";

export {
  base64ToBytes,
  bytesToBase64,
  decryptBytes,
  encryptBytes,
  generateKey,
} from "./aead";

export { wipeBytes } from "./wipe";

// Canonical byte<->hex encoding for anything stored as a string (e.g.
// kdfSalt in UserProfileDocument) — re-exported so every call site uses the
// same encoding instead of each reimplementing hex conversion.
export { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
