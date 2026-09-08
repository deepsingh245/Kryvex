/**
 * Resolves the "prelogin" problem: a client needs kdfSalt/kdfParams to
 * derive the Firebase Auth credential, but the users/{uid} Firestore rule
 * requires being authenticated to read it. See
 * docs/CRYPTOGRAPHIC_ARCHITECTURE.md §4.1.
 *
 * Deliberately unauthenticated (that's the point) and deliberately narrow:
 * uses the Admin SDK (bypasses Firestore rules — no rules change needed)
 * to return only { kdfSalt, kdfParams } for a given email, never ciphertext
 * or anything else. Returns null uniformly for "no such account" and
 * "account exists but profile incomplete" — matches how established
 * zero-knowledge password managers avoid trivially distinguishing the two.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { UserProfileDocument } from "@kryvex/types";

interface GetKdfParamsRequest {
  email?: unknown;
}

interface GetKdfParamsResponse {
  kdfSalt: string;
  kdfParams: UserProfileDocument["kdfParams"];
}

// Exported for unit testing only — the full onCall behavior (Admin SDK
// calls) is covered by tests/auth against the real emulator, not here,
// since plain `pnpm test` must not require a running emulator (same reason
// tests/security is its own workspace rather than co-located in a package).
export function normalizeEmail(input: unknown): string {
  return typeof input === "string" ? input.trim().toLowerCase() : "";
}

export function isValidEmail(email: string): boolean {
  return email.length > 0 && email.includes("@");
}

// App Check enforcement (docs/FIREBASE_SECURITY.md §4) is future hardening,
// not enabled here yet: neither apps/web nor apps/mobile initializes App
// Check or attaches a token to Functions calls as of Phase 2, so
// `enforceAppCheck: true` would reject every real call identically to how
// it broke this function's own emulator tests during development. Add it
// once both clients are wired up to attach tokens (see build spec §69's
// broader App Check rollout, tracked for Phase 9).
export const getKdfParams = onCall<GetKdfParamsRequest>(
  {},
  async (request): Promise<GetKdfParamsResponse | null> => {
    const email = normalizeEmail(request.data?.email);
    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }

    let uid: string;
    try {
      uid = (await getAuth().getUserByEmail(email)).uid;
    } catch {
      return null; // no such account
    }

    const snap = await getFirestore().doc(`users/${uid}`).get();
    if (!snap.exists) return null; // mid-signup edge case

    const data = snap.data() as UserProfileDocument;
    return { kdfSalt: data.kdfSalt, kdfParams: data.kdfParams };
  },
);
