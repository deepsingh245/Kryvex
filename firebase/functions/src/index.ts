/**
 * Phase 1 scaffold only. Real functions (account deletion, tombstone GC —
 * see docs/FIREBASE_SECURITY.md §6) land alongside the features they
 * support. This trivial callable proves the Functions codebase builds,
 * lints, typechecks, and deploys/emulates correctly before any real logic
 * is added. It never touches vault ciphertext or key material.
 */

import { initializeApp } from "firebase-admin/app";
import { onCall } from "firebase-functions/v2/https";

// Required once, before any firebase-admin/* module (getAuth, getFirestore,
// etc.) is used — getKdfParams.ts relies on this having already run.
initializeApp();

export const ping = onCall(() => {
  return { ok: true, phase: 1 };
});

export { getKdfParams } from "./getKdfParams";
