export { resolveFirebaseEmulatorConfig } from "./emulatorConfig";
export type {
  FirebaseEmulatorConfig,
  FirebaseEmulatorPorts,
  ResolveFirebaseEmulatorConfigInput,
} from "./emulatorConfig";

export {
  connectServicesToEmulator,
  getOrCreateFirebaseApp,
  initializeKryvexFirebase,
} from "./app";

export { initializeKryvexFirebaseExtension } from "./appExtension";
export type { KryvexFirebaseExtensionServices } from "./appExtension";
export type {
  KryvexAppCheckOptions,
  KryvexFirebaseConfig,
  KryvexFirebaseServices,
} from "./app";

// apps/mobile only — see appNative.ts's top comment for why this can't be
// folded into initializeKryvexFirebase above.
export { initializeKryvexFirebaseNative } from "./appNative";

export {
  confirmVaultRecovery,
  observeAuthState,
  sendVaultRecoveryEmail,
  signInWithAuthSecret,
  signOutKryvex,
  signUpWithAuthSecret,
  verifyRecoveryCode,
} from "./auth";

export {
  observeExtensionAuthState,
  signInWithAuthSecretExtension,
  signOutKryvexExtension,
} from "./authExtension";

export {
  createUserProfileDocument,
  fetchUserProfileDocument,
  updateUserProfileDocument,
} from "./userProfile";

export { resolveKdfParamsForEmail } from "./prelogin";
export { resolveRecoveryEnvelopeForEmail } from "./recovery";

export {
  createVaultItem,
  fetchVaultItem,
  fetchVaultItems,
  softDeleteVaultItem,
  subscribeToVaultItems,
  updateVaultItem,
} from "./vaultItems";

export {
  createAttachmentDocument,
  downloadAttachmentBlob,
  fetchAttachmentDocument,
  softDeleteAttachmentDocument,
  uploadAttachmentBlob,
} from "./attachments";
