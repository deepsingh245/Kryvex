/**
 * Resolves whether/how a client should connect to the Firebase Emulator
 * Suite (docs/DEVELOPMENT.md §4) instead of production. Deliberately takes
 * plain strings rather than reading `process.env` itself: apps/web
 * (NEXT_PUBLIC_*) and apps/mobile (EXPO_PUBLIC_*) use different env-var
 * prefixing conventions, so this package stays bundler-agnostic and lets
 * each app pass in its own already-resolved env values.
 *
 * Real `initializeApp`/`connectFirestoreEmulator` calls are Phase 2 work —
 * they need actual Firebase project config, which is an auth-flow concern.
 * This function only decides *where* a client would connect, not how to
 * connect.
 */

export interface FirebaseEmulatorPorts {
  auth: number;
  firestore: number;
  storage: number;
  functions: number;
}

export interface FirebaseEmulatorConfig {
  useEmulator: boolean;
  host: string;
  ports: FirebaseEmulatorPorts;
}

// Matches the ports declared in firebase.json at the repo root.
const DEFAULT_PORTS: FirebaseEmulatorPorts = {
  auth: 9099,
  firestore: 8080,
  storage: 9199,
  functions: 5001,
};

export interface ResolveFirebaseEmulatorConfigInput {
  useEmulator?: string;
  host?: string;
}

export function resolveFirebaseEmulatorConfig(
  env: ResolveFirebaseEmulatorConfigInput,
): FirebaseEmulatorConfig {
  return {
    useEmulator: env.useEmulator === "true",
    host: env.host && env.host.length > 0 ? env.host : "localhost",
    ports: DEFAULT_PORTS,
  };
}
