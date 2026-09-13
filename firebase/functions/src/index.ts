/**
 * Real functions land alongside the features they support — tombstone GC
 * (Phase 5) below; account deletion is still future work. `ping` proves the
 * Functions codebase builds, lints, typechecks, and deploys/emulates
 * correctly. Nothing in this codebase touches vault ciphertext or key
 * material.
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
export { tombstoneGc } from "./tombstoneGc";
