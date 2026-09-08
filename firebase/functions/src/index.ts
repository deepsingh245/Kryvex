/**
 * Phase 1 scaffold only. Real functions (account deletion, tombstone GC —
 * see docs/FIREBASE_SECURITY.md §6) land alongside the features they
 * support. This trivial callable proves the Functions codebase builds,
 * lints, typechecks, and deploys/emulates correctly before any real logic
 * is added. It never touches vault ciphertext or key material.
 */

import { onCall } from "firebase-functions/v2/https";

export const ping = onCall(() => {
  return { ok: true, phase: 1 };
});
