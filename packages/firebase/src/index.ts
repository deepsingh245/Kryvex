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
export type { KryvexFirebaseConfig, KryvexFirebaseServices } from "./app";

// apps/mobile only — see appNative.ts's top comment for why this can't be
// folded into initializeKryvexFirebase above.
export { initializeKryvexFirebaseNative } from "./appNative";

export {
  observeAuthState,
  signInWithAuthSecret,
  signOutKryvex,
  signUpWithAuthSecret,
} from "./auth";

export {
  createUserProfileDocument,
  fetchUserProfileDocument,
} from "./userProfile";

export { resolveKdfParamsForEmail } from "./prelogin";
