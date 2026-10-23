/**
 * Chrome extension-safe Firebase surface. Keep this barrel deliberately
 * narrow so WXT never pulls web App Check, native Auth, Functions-only flows,
 * or Firebase Storage attachment code into the MV3 worker bundle.
 */
export { initializeKryvexFirebaseExtension } from "./appExtension";
export type { KryvexFirebaseExtensionServices } from "./appExtension";
export type { KryvexFirebaseConfig } from "./app";

export {
  observeExtensionAuthState,
  signInWithAuthSecretExtension,
  signOutKryvexExtension,
} from "./authExtension";
export { fetchUserProfileDocument } from "./userProfile";
export { resolveKdfParamsForEmail } from "./prelogin";
export {
  createVaultItem,
  fetchVaultItem,
  fetchVaultItems,
  subscribeToVaultItems,
  updateVaultItem,
} from "./vaultItems";
