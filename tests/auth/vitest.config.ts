import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Firebase's Installations SDK (used internally by Functions'
    // httpsCallable) needs IndexedDB, which only exists in real
    // browser/React Native environments — not plain Node/Vitest. Without
    // this polyfill, calls to the emulator fail with a misleading
    // "Unauthenticated [401]" even though the function itself runs fine
    // server-side. Test-environment-only; production clients (apps/web,
    // apps/mobile) have real IndexedDB/AsyncStorage and don't need this.
    setupFiles: ["fake-indexeddb/auto"],
    // The first httpsCallable request to a freshly-started Functions
    // emulator has observed cold-start latency occasionally exceeding
    // Vitest's 5s default (the function itself consistently finishes in
    // <50ms server-side, per its own logs) — a known Cloud Functions
    // characteristic, not a hang. Generous but not unbounded.
    testTimeout: 20000,
  },
});
