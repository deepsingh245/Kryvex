import type { KryvexFirebaseConfig } from "@kryvex/firebase";

// packages/firebase deliberately doesn't read process.env itself (bundler-
// agnostic) — see its emulatorConfig.ts doc comment. This is where apps/web
// resolves its own NEXT_PUBLIC_*-prefixed values and hands them over.
export const webFirebaseConfig: KryvexFirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-kryvex",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

export const webFirebaseEmulatorEnv = {
  useEmulator: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR,
  host: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST,
};
