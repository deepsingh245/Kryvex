/**
 * Firebase app/service initialization for apps/web. Deliberately takes an
 * already-built config object and already-resolved emulator env values
 * rather than reading `process.env` itself — apps/web (NEXT_PUBLIC_*) and
 * apps/mobile (EXPO_PUBLIC_*) use different prefixing conventions, so this
 * package stays bundler-agnostic (see emulatorConfig.ts's existing doc
 * comment).
 *
 * apps/mobile does NOT use initializeKryvexFirebase(): calling plain
 * getAuth(app) (as this does) implicitly initializes a non-persistent Auth
 * instance, and Firebase throws if initializeAuth() is called on an app
 * that already has an Auth instance — so React Native's persistence-aware
 * setup (initializeAuthForReactNative in appNative.ts) MUST run before
 * anything calls getAuth() on that app. See appNative.ts.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from "firebase/functions";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";
import {
  resolveFirebaseEmulatorConfig,
  type ResolveFirebaseEmulatorConfigInput,
} from "./emulatorConfig";

export interface KryvexFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
}

export interface KryvexFirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
  functions: Functions;
}

/** Shared by app.ts and appNative.ts — safe to call repeatedly (HMR-safe). */
export function getOrCreateFirebaseApp(
  config: KryvexFirebaseConfig,
): FirebaseApp {
  return getApps().length > 0 ? getApp() : initializeApp(config);
}

/**
 * Connects the given services to the emulator suite when configured to.
 * Wrapped in try/catch: Fast Refresh (web) / Metro hot reload (mobile) can
 * re-execute the calling module, and a repeat connect*Emulator call throws
 * "already connected" rather than being a no-op — HMR-safe to ignore.
 */
export function connectServicesToEmulator(
  services: KryvexFirebaseServices,
  emulatorEnv: ResolveFirebaseEmulatorConfigInput,
): void {
  const emulator = resolveFirebaseEmulatorConfig(emulatorEnv);
  if (!emulator.useEmulator) return;
  try {
    connectAuthEmulator(
      services.auth,
      `http://${emulator.host}:${emulator.ports.auth}`,
      {
        disableWarnings: true,
      },
    );
    connectFirestoreEmulator(
      services.firestore,
      emulator.host,
      emulator.ports.firestore,
    );
    connectStorageEmulator(
      services.storage,
      emulator.host,
      emulator.ports.storage,
    );
    connectFunctionsEmulator(
      services.functions,
      emulator.host,
      emulator.ports.functions,
    );
  } catch {
    // Already connected (HMR re-entry) — safe to ignore.
  }
}

// Module-scope cache: initializeApp/getAuth/connect*Emulator must each run
// exactly once per app instance.
let cached: KryvexFirebaseServices | null = null;

/** Web-only entrypoint — see this file's top comment for why mobile can't use it. */
export function initializeKryvexFirebase(
  config: KryvexFirebaseConfig,
  emulatorEnv: ResolveFirebaseEmulatorConfigInput,
): KryvexFirebaseServices {
  if (cached) return cached;

  const app = getOrCreateFirebaseApp(config);
  const services: KryvexFirebaseServices = {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
    functions: getFunctions(app),
  };
  connectServicesToEmulator(services, emulatorEnv);

  cached = services;
  return cached;
}
