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

// Phase 9w — see docs/DEPLOYMENT.md's App Check checklist item: a real
// reCAPTCHA v3 site key must be provisioned in Firebase Console before
// production deploy. Undefined here just means App Check stays inactive
// outside emulator mode — safe today since nothing enforces it yet.
export const webFirebaseAppCheckOptions = {
  siteKey: process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY,
  debug: webFirebaseEmulatorEnv.useEmulator === "true",
};
