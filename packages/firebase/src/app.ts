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
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from "firebase/app-check";
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
  // undefined when App Check isn't configured for this session (no site
  // key and not running against the emulator) — Phase 9w wires this up on
  // the web client, but no Cloud Function enforces it yet (see
  // firebase/functions/src/getKdfParams.ts's own comment on why: apps/mobile
  // isn't wired up yet, and enforcing now would lock mobile out).
  appCheck?: AppCheck | undefined;
}

export interface KryvexAppCheckOptions {
  /** reCAPTCHA v3 site key from the Firebase Console. Omit to skip App
   * Check entirely outside emulator mode (e.g. local dev with no key
   * provisioned yet) — safe today since nothing enforces it server-side. */
  siteKey?: string | undefined;
  /** Set only when connecting to the emulator suite — lets App Check debug
   * mode activate without a real site key. See docs/DEVELOPMENT.md §4. */
  debug?: boolean | undefined;
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

/**
 * Phase 9w: wires App Check on the web client. No Cloud Function enforces
 * it yet (see KryvexFirebaseServices' doc comment on `appCheck`) — this
 * only attaches a token to outgoing requests, in preparation for that
 * enforcement being turned on once apps/mobile is wired up too. Never
 * throws: an optional hardening layer failing to initialize (missing site
 * key, HMR re-entry, ad blocker interference with the reCAPTCHA script,
 * etc.) must not block the app from starting.
 */
function initializeKryvexAppCheck(
  app: FirebaseApp,
  options: KryvexAppCheckOptions | undefined,
): AppCheck | undefined {
  // Same "web-only, client-only call site" contract as the rest of this
  // file (see initializeKryvexFirebase's own doc comment) — no separate
  // SSR guard needed beyond what every other service getter here already
  // assumes.
  if (!options?.siteKey && !options?.debug) return undefined;

  try {
    if (options.debug) {
      // https://firebase.google.com/docs/app-check/web/debug-provider —
      // must be set before initializeAppCheck. A real site key still isn't
      // used for network calls once this flag is set, so a placeholder is
      // fine when running against the emulator without one configured.
      (
        globalThis as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }
      ).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    return initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(options.siteKey ?? "debug-mode"),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    return undefined;
  }
}

// Module-scope cache: initializeApp/getAuth/connect*Emulator must each run
// exactly once per app instance.
let cached: KryvexFirebaseServices | null = null;

/** Web-only entrypoint — see this file's top comment for why mobile can't use it. */
export function initializeKryvexFirebase(
  config: KryvexFirebaseConfig,
  emulatorEnv: ResolveFirebaseEmulatorConfigInput,
  appCheckOptions?: KryvexAppCheckOptions,
): KryvexFirebaseServices {
  if (cached) return cached;

  const app = getOrCreateFirebaseApp(config);
  const services: KryvexFirebaseServices = {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
    functions: getFunctions(app),
    appCheck: initializeKryvexAppCheck(app, appCheckOptions),
  };
  connectServicesToEmulator(services, emulatorEnv);

  cached = services;
  return cached;
}
