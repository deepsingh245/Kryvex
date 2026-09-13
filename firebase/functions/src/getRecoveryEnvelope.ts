/**
 * Resolves the recovery-flow chicken-and-egg problem, same shape as
 * getKdfParams.ts: a user recovering their vault with a Recovery Key has
 * forgotten their master password, which means they also don't know the
 * derived Firebase Auth credential (authSecret) — so they can't sign in to
 * read users/{uid} normally. See docs/RECOVERY.md §3.
 *
 * Deliberately unauthenticated (that's the point) and deliberately narrow:
 * uses the Admin SDK (bypasses Firestore rules — no rules change needed) to
 * return only { protectedVaultKeyByRecovery } for a given email, never
 * kdfSalt/protectedVaultKey/anything else. Returning this ciphertext alone
 * is safe — it's useless without the Recovery Key itself, which the server
 * never sees. Returns null uniformly for "no such account", "account exists
 * but profile incomplete", and "no recovery key was ever set up" — same
 * non-distinguishing precedent getKdfParams.ts already established.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import type { UserProfileDocument } from "@kryvex/types";
import { isValidEmail, normalizeEmail } from "./getKdfParams";

interface GetRecoveryEnvelopeRequest {
  email?: unknown;
}

interface GetRecoveryEnvelopeResponse {
  protectedVaultKeyByRecovery: NonNullable<
    UserProfileDocument["protectedVaultKeyByRecovery"]
  >;
}

// Same "future hardening, not yet enabled" App Check note as getKdfParams.ts
// — see its own header comment for why (tracked for Phase 9).
export const getRecoveryEnvelope = onCall<GetRecoveryEnvelopeRequest>(
  {},
  async (request): Promise<GetRecoveryEnvelopeResponse | null> => {
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
    if (!data.protectedVaultKeyByRecovery) return null; // no recovery key set up

    return { protectedVaultKeyByRecovery: data.protectedVaultKeyByRecovery };
  },
);
