/**
 * React Native-only Firebase initialization. Kept out of app.ts so
 * packages/firebase never imports @react-native-async-storage/async-storage
 * itself — apps/mobile constructs the `persistence` value (via
 * `getReactNativePersistence(AsyncStorage)` from "firebase/auth") and passes
 * it in, keeping this package's platform-agnostic contract intact.
 *
 * Must call initializeAuth() before anything else calls getAuth() on this
 * app — Firebase throws "already-initialized" otherwise. See app.ts's top
 * comment for why apps/web's initializeKryvexFirebase() can't be reused here.
 */

import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  initializeAuth,
  type Auth,
  type Persistence,
} from "firebase/auth";
import {
  connectServicesToEmulator,
  getOrCreateFirebaseApp,
  type KryvexFirebaseConfig,
  type KryvexFirebaseServices,
} from "./app";
import type { ResolveFirebaseEmulatorConfigInput } from "./emulatorConfig";

// Not derived via `Parameters<typeof initializeAuth>` — that extraction
// pulls in an `| undefined` that `exactOptionalPropertyTypes: true` then
// rejects when passed through to Dependencies.persistence below. The
// caller (apps/mobile) always constructs a real Persistence value via
// getReactNativePersistence(AsyncStorage), never undefined.
type AuthPersistence = Persistence | Persistence[];

let cached: KryvexFirebaseServices | null = null;

export function initializeKryvexFirebaseNative(
  config: KryvexFirebaseConfig,
  emulatorEnv: ResolveFirebaseEmulatorConfigInput,
  persistence: AuthPersistence,
): KryvexFirebaseServices {
  if (cached) return cached;

  const app = getOrCreateFirebaseApp(config);
  let auth: Auth;
  try {
    auth = initializeAuth(app, { persistence });
  } catch {
    // HMR re-entry: initializeAuth was already called for this app in a
    // prior module evaluation (Metro fast refresh). Reuse the existing
    // instance instead — safe because the module-scope `cached` guard above
    // only misses on a genuine reload, at which point Firebase's own
    // internal app registry (not this file) is what's stale.
    auth = getAuth(app);
  }

  const services: KryvexFirebaseServices = {
    app,
    auth,
    firestore: getFirestore(app),
    storage: getStorage(app),
    functions: getFunctions(app),
  };
  connectServicesToEmulator(services, emulatorEnv);

  cached = services;
  return cached;
}
