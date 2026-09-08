import type { KryvexFirebaseConfig } from "@kryvex/firebase";

// packages/firebase deliberately doesn't read process.env itself (bundler-
// agnostic) — see its emulatorConfig.ts doc comment. This is where
// apps/mobile resolves its own EXPO_PUBLIC_*-prefixed values.
export const mobileFirebaseConfig: KryvexFirebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-kryvex",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const mobileFirebaseEmulatorEnv = {
  useEmulator: process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR,
  host: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST,
};
