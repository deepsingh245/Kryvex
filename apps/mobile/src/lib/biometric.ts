/**
 * Native biometric unlock.
 *
 * The Vault Encryption Key is stored only in Expo SecureStore with
 * `requireAuthentication`, which maps to Android Keystore user-authentication
 * protection. AsyncStorage holds only a non-secret enrollment marker so the
 * unlock screen can decide whether to render the biometric button without
 * triggering a prompt.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { base64ToBytes, bytesToBase64 } from "@kryvex/crypto";

const SECURE_STORE_KEY = "kryvex.biometric.v1";
const KEYCHAIN_SERVICE = "kryvex.biometric.v1";
const ENROLLMENT_MARKER_KEY = "kryvex.biometric.enrolled-user.v1";
const VAULT_KEY_BYTES = 32;

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  authenticationPrompt: "Unlock Kryvex",
  keychainService: KEYCHAIN_SERVICE,
  requireAuthentication: true,
};

interface NativeBiometricRecord {
  uid: string;
  vaultEncryptionKey: string;
}

export class BiometricUnsupportedError extends Error {
  constructor(
    reason = "A strong fingerprint or face unlock isn't available on this device.",
  ) {
    super(reason);
    this.name = "BiometricUnsupportedError";
  }
}

export async function isBiometricSupported(): Promise<boolean> {
  try {
    const [secureStoreAvailable, hasHardware, isEnrolled, securityLevel] =
      await Promise.all([
        SecureStore.isAvailableAsync(),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.getEnrolledLevelAsync(),
      ]);
    return (
      secureStoreAvailable &&
      hasHardware &&
      isEnrolled &&
      securityLevel === LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG
    );
  } catch {
    return false;
  }
}

export async function hasBiometricEnrollment(uid: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ENROLLMENT_MARKER_KEY)) === uid;
  } catch {
    return false;
  }
}

export async function enrollBiometric(
  uid: string,
  vaultEncryptionKey: Uint8Array,
): Promise<void> {
  if (vaultEncryptionKey.length !== VAULT_KEY_BYTES) {
    throw new Error("Invalid vault key.");
  }
  if (!(await isBiometricSupported())) throw new BiometricUnsupportedError();

  const record: NativeBiometricRecord = {
    uid,
    vaultEncryptionKey: bytesToBase64(vaultEncryptionKey),
  };
  await SecureStore.setItemAsync(
    SECURE_STORE_KEY,
    JSON.stringify(record),
    SECURE_STORE_OPTIONS,
  );
  await AsyncStorage.setItem(ENROLLMENT_MARKER_KEY, uid);
}

export async function unlockWithBiometric(uid: string): Promise<Uint8Array> {
  if (!(await hasBiometricEnrollment(uid))) {
    throw new BiometricUnsupportedError("Biometric unlock isn't enabled.");
  }

  const stored = await SecureStore.getItemAsync(
    SECURE_STORE_KEY,
    SECURE_STORE_OPTIONS,
  );
  if (!stored) {
    await AsyncStorage.removeItem(ENROLLMENT_MARKER_KEY);
    throw new BiometricUnsupportedError(
      "Biometric enrollment is no longer valid. Unlock with your master password and enable it again.",
    );
  }

  try {
    const record = JSON.parse(stored) as Partial<NativeBiometricRecord>;
    if (record.uid !== uid || typeof record.vaultEncryptionKey !== "string") {
      throw new Error("Biometric enrollment belongs to another account.");
    }
    const vaultEncryptionKey = base64ToBytes(record.vaultEncryptionKey);
    if (vaultEncryptionKey.length !== VAULT_KEY_BYTES) {
      throw new Error("Invalid biometric vault key.");
    }
    return vaultEncryptionKey;
  } catch {
    await AsyncStorage.removeItem(ENROLLMENT_MARKER_KEY);
    throw new BiometricUnsupportedError(
      "Biometric enrollment is invalid. Unlock with your master password and enable it again.",
    );
  }
}

export async function clearAllBiometric(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SECURE_STORE_KEY, {
      keychainService: KEYCHAIN_SERVICE,
    });
  } finally {
    await AsyncStorage.removeItem(ENROLLMENT_MARKER_KEY);
  }
}
