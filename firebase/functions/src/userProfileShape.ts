/**
 * Hand-synced duplicate of the fields these functions actually read from
 * @kryvex/types's UserProfileDocument (packages/types/src/userProfile.ts) —
 * not imported directly because this package's deployed package.json can't
 * carry any pnpm-specific "workspace" or "catalog" protocol dependency (see
 * package.json), and a TS `paths` mapping straight to that package's source
 * pulls it outside this package's `rootDir`, which `tsc` rejects. Same
 * accepted-duplicate precedent as firestore.rules' ITEM_TYPES list — keep
 * these fields in sync by hand if the real type's shape changes.
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

export interface UserProfileDocument {
  kdfSalt: string;
  kdfParams: KdfParams;
  protectedVaultKeyByRecovery?: EncryptedEnvelope;
}
