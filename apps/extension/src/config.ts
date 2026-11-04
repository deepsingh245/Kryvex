import type { KryvexFirebaseConfig } from "@kryvex/firebase/extension";

export const extensionFirebaseConfig: KryvexFirebaseConfig = {
  apiKey: import.meta.env.WXT_FIREBASE_API_KEY ?? "",
  authDomain: import.meta.env.WXT_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: import.meta.env.WXT_FIREBASE_PROJECT_ID ?? "demo-kryvex",
  storageBucket: import.meta.env.WXT_FIREBASE_STORAGE_BUCKET ?? "",
  appId: import.meta.env.WXT_FIREBASE_APP_ID ?? "",
};

export const extensionFirebaseEmulatorEnv = {
  useEmulator: import.meta.env.WXT_USE_FIREBASE_EMULATOR,
  host: import.meta.env.WXT_FIREBASE_EMULATOR_HOST,
};

export const allowLocalhostHttp = import.meta.env.DEV;

export const kryvexWebOrigin = (
  import.meta.env.WXT_KRYVEX_WEB_ORIGIN ??
  (import.meta.env.DEV ? "http://localhost:3000" : "https://kryvex.app")
).replace(/\/$/, "");
