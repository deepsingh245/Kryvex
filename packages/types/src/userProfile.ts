/**
 * Non-secret account/profile document — see docs/DATA_MODEL.md §4.
 * Created at signup with a subset of fields (uid/email/kdfSalt/kdfParams/
 * createdAt/settings); protectedVaultKey is added starting Phase 3, once a
 * Vault Encryption Key exists to wrap. The profile document is updated, not
 * recreated, when that happens.
 */

export interface EncryptedEnvelope {
  v: 1;
  alg: "AES-256-GCM";
  nonce: string;
  ciphertext: string;
}

export interface KdfParams {
  memoryKiB: number;
  iterations: number;
  parallelism: number;
  version: number;
}

export interface UserProfileSettings {
  autoLockMinutes: number;
  clipboardClearSeconds: number;
  biometricUnlockEnabled: boolean;
}

export interface UserProfileDocument {
  uid: string;
  email: string;
  kdfSalt: string;
  kdfParams: KdfParams;
  protectedVaultKey?: EncryptedEnvelope;
  protectedVaultKeyByRecovery?: EncryptedEnvelope;
  createdAt: unknown; // Firestore Timestamp — typed precisely once read/write serialization is finalized
  settings: UserProfileSettings;
}
