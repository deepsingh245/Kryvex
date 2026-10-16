/**
 * Web biometric unlock — see docs/CRYPTOGRAPHIC_ARCHITECTURE.md §2/§7.
 *
 * A bare WebAuthn assertion proves nothing cryptographically (it yields no
 * key), so this relies on the WebAuthn PRF extension: the platform
 * authenticator (Touch ID / Windows Hello / Android) derives a secret inside
 * the authenticator and releases it only after user verification. That secret
 * wraps the Vault Encryption Key (AES-256-GCM, same primitive as everywhere
 * else). The resulting envelope is stored device-locally in IndexedDB — it is
 * ciphertext, useless without that authenticator + biometric, and is never
 * sent to the server. No PRF support => no biometric unlock (no weaker
 * fallback): the master password always still works.
 */

import { openDB, type IDBPDatabase } from "idb";
import {
  base64ToBytes,
  bytesToBase64,
  decryptBytes,
  deriveBiometricWrapKey,
  encryptBytes,
  generateKey,
  wipeBytes,
} from "@kryvex/crypto";
import type { EncryptedEnvelope } from "@kryvex/types";

const DB_NAME = "kryvex-biometric";
const DB_VERSION = 1;
const STORE_NAME = "enrollments";

interface BiometricRecord {
  uid: string;
  credentialId: string; // base64
  prfSalt: string; // base64
  envelope: EncryptedEnvelope;
}

export class BiometricUnsupportedError extends Error {
  constructor(
    reason = "Secure biometric unlock isn't supported on this browser or device.",
  ) {
    super(reason);
    this.name = "BiometricUnsupportedError";
  }
}

// Copies into a plain ArrayBuffer — lib.dom's BufferSource rejects
// Uint8Array<ArrayBufferLike> (could be SharedArrayBuffer-backed).
function toBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: "uid" });
    },
  });
}

/** Best-effort pre-check; PRF itself can only be confirmed during enrollment. */
export async function isBiometricSupported(): Promise<boolean> {
  try {
    if (
      typeof window === "undefined" ||
      typeof PublicKeyCredential === "undefined" ||
      !navigator.credentials
    ) {
      return false;
    }
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function hasBiometricEnrollment(uid: string): Promise<boolean> {
  try {
    const db = await getDb();
    return (await db.get(STORE_NAME, uid)) !== undefined;
  } catch {
    return false;
  }
}

/** Removes every enrollment on this device (used on sign-out). */
export async function clearAllBiometric(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE_NAME);
  } catch {
    // Nothing to clear / storage unavailable — nothing sensitive left behind.
  }
}

export async function clearBiometric(uid: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_NAME, uid);
  } catch {
    // see clearAllBiometric
  }
}

interface PrfClientResults {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } };
}

// lib.dom's AuthenticationExtensionsClientInputs has no `prf` yet.
type WithPrf<T> = T & { extensions?: Record<string, unknown> };

async function evaluatePrf(
  credentialId: Uint8Array,
  prfSalt: Uint8Array,
): Promise<Uint8Array> {
  const options: WithPrf<PublicKeyCredentialRequestOptions> = {
    challenge: toBuffer(generateKey()),
    allowCredentials: [{ type: "public-key", id: toBuffer(credentialId) }],
    userVerification: "required",
    timeout: 60_000,
    extensions: { prf: { eval: { first: toBuffer(prfSalt) } } },
  };
  const assertion = (await navigator.credentials.get({
    publicKey: options,
  })) as PublicKeyCredential | null;
  const first = (
    assertion?.getClientExtensionResults() as PrfClientResults | undefined
  )?.prf?.results?.first;
  if (!first) {
    throw new BiometricUnsupportedError(
      "This device's biometric authenticator didn't provide the secret needed to protect your vault (WebAuthn PRF isn't supported by this browser or authenticator). Your master password still works.",
    );
  }
  return new Uint8Array(first);
}

/**
 * Registers a platform credential and wraps the Vault Encryption Key under
 * its PRF-derived key. Caller must already have verified the master password.
 */
export async function enrollBiometric(
  uid: string,
  email: string,
  vaultEncryptionKey: Uint8Array,
): Promise<void> {
  if (!(await isBiometricSupported())) throw new BiometricUnsupportedError();

  const createOptions: WithPrf<PublicKeyCredentialCreationOptions> = {
    challenge: toBuffer(generateKey()),
    rp: { name: "Kryvex" },
    user: {
      id: toBuffer(generateKey().slice(0, 16)),
      name: email,
      displayName: email,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 },
      { type: "public-key", alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      // Android Chrome routes residentKey="discouraged" registrations to
      // the legacy GMS FIDO2 path. PRF-capable Google Password Manager lives
      // behind Credential Manager, which Chrome selects for discoverable
      // credentials ("preferred"/"required"). Requiring one also prevents
      // enrollment from succeeding with a credential that cannot later
      // provide the PRF output used to unwrap the vault key.
      residentKey: "required",
    },
    timeout: 60_000,
    extensions: { prf: {} },
  };
  const credential = (await navigator.credentials.create({
    publicKey: createOptions,
  })) as PublicKeyCredential | null;
  if (!credential) {
    throw new BiometricUnsupportedError("Biometric enrollment was cancelled.");
  }
  // Only an explicit `enabled: false` is conclusive at this point — some
  // browsers omit the field at create time and only reveal PRF support when
  // the secret is actually evaluated below, which fails closed if absent.
  const prfEnabled = (
    credential.getClientExtensionResults() as PrfClientResults
  ).prf?.enabled;
  if (prfEnabled === false) {
    throw new BiometricUnsupportedError(
      "This browser/device's biometric authenticator doesn't support the WebAuthn PRF extension needed to protect your vault. Your master password still works.",
    );
  }

  const credentialId = new Uint8Array(credential.rawId);
  const prfSalt = generateKey();
  const prfOutput = await evaluatePrf(credentialId, prfSalt);
  const wrapKey = deriveBiometricWrapKey(prfOutput);
  const envelope = encryptBytes(wrapKey, vaultEncryptionKey);
  wipeBytes(prfOutput);
  wipeBytes(wrapKey);

  const record: BiometricRecord = {
    uid,
    credentialId: bytesToBase64(credentialId),
    prfSalt: bytesToBase64(prfSalt),
    envelope,
  };
  const db = await getDb();
  await db.put(STORE_NAME, record);
}

/**
 * Prompts for the biometric and returns the unwrapped Vault Encryption Key.
 * Throws if cancelled, unsupported, or the envelope fails AEAD verification
 * (in which case the stale enrollment is removed — master password remains
 * the way in).
 */
export async function unlockWithBiometric(uid: string): Promise<Uint8Array> {
  const db = await getDb();
  const record = (await db.get(STORE_NAME, uid)) as BiometricRecord | undefined;
  if (!record) throw new BiometricUnsupportedError();

  const prfOutput = await evaluatePrf(
    base64ToBytes(record.credentialId),
    base64ToBytes(record.prfSalt),
  );
  const wrapKey = deriveBiometricWrapKey(prfOutput);
  wipeBytes(prfOutput);
  try {
    return decryptBytes(wrapKey, record.envelope);
  } catch (err) {
    await clearBiometric(uid);
    throw err;
  } finally {
    wipeBytes(wrapKey);
  }
}
