/**
 * Chrome Manifest V3 service-worker initialization. Authentication must come
 * from firebase/auth/web-extension; importing the normal browser Auth entry
 * point here would pull DOM assumptions into the worker bundle.
 */
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from "firebase/auth/web-extension";
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
  resolveFirebaseEmulatorConfig,
  type ResolveFirebaseEmulatorConfigInput,
} from "./emulatorConfig";
import type { KryvexFirebaseConfig } from "./app";

const EXTENSION_APP_NAME = "kryvex-extension";

export interface KryvexFirebaseExtensionServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
}

let cachedExtensionServices: KryvexFirebaseExtensionServices | null = null;

export function initializeKryvexFirebaseExtension(
  config: KryvexFirebaseConfig,
  emulatorEnv: ResolveFirebaseEmulatorConfigInput,
): KryvexFirebaseExtensionServices {
  if (cachedExtensionServices) return cachedExtensionServices;

  const app =
    getApps().find((candidate) => candidate.name === EXTENSION_APP_NAME) ??
    initializeApp(config, EXTENSION_APP_NAME);

  let auth: Auth;
  try {
    auth = initializeAuth(app, { persistence: indexedDBLocalPersistence });
  } catch {
    // Re-entry after a service-worker hot reload or another extension page
    // initialized the same named app in this JS context.
    auth = getAuth(app);
  }

  const services: KryvexFirebaseExtensionServices = {
    app,
    auth,
    firestore: getFirestore(app),
    functions: getFunctions(app),
  };

  const emulator = resolveFirebaseEmulatorConfig(emulatorEnv);
  if (emulator.useEmulator) {
    try {
      connectAuthEmulator(
        auth,
        `http://${emulator.host}:${emulator.ports.auth}`,
        { disableWarnings: true },
      );
      connectFirestoreEmulator(
        services.firestore,
        emulator.host,
        emulator.ports.firestore,
      );
      connectFunctionsEmulator(
        services.functions,
        emulator.host,
        emulator.ports.functions,
      );
    } catch {
      // Emulator connectors throw when a hot reload connects twice.
    }
  }

  cachedExtensionServices = services;
  return services;
}
