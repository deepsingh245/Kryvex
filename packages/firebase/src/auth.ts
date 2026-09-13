/**
 * Thin Firebase Auth wrappers. Parameters are named `authSecret` throughout
 * — never `password` — as a deliberate guardrail: this value must always be
 * the HKDF-derived output from packages/crypto's deriveAuthAndStretchedKey,
 * never the raw master password. See docs/CRYPTOGRAPHIC_ARCHITECTURE.md §4.
 */

import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  verifyPasswordResetCode,
  type Auth,
  type User,
} from "firebase/auth";
import type { AuthenticatedUser } from "@kryvex/types";

function toKryvexUser(user: User): AuthenticatedUser {
  return { uid: user.uid, email: user.email ?? "" };
}

export async function signUpWithAuthSecret(
  auth: Auth,
  email: string,
  authSecret: string,
): Promise<AuthenticatedUser> {
  const cred = await createUserWithEmailAndPassword(auth, email, authSecret);
  return toKryvexUser(cred.user);
}

export async function signInWithAuthSecret(
  auth: Auth,
  email: string,
  authSecret: string,
): Promise<AuthenticatedUser> {
  const cred = await signInWithEmailAndPassword(auth, email, authSecret);
  return toKryvexUser(cred.user);
}

export async function signOutKryvex(auth: Auth): Promise<void> {
  await firebaseSignOut(auth);
}

/** Returns an unsubscribe function. */
export function observeAuthState(
  auth: Auth,
  onChange: (user: AuthenticatedUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, (user) =>
    onChange(user ? toKryvexUser(user) : null),
  );
}

/**
 * Recovery flow — see docs/RECOVERY.md §3. Firebase's own oobCode-based
 * password reset is what actually lets the Auth credential (authSecret)
 * change when the user can't sign in normally (they forgot the master
 * password it's derived from) — this is a real security gate (proof of
 * email-inbox control), not a workaround, and is independent of the
 * Recovery-Key-unwraps-the-VEK check done elsewhere.
 */
export async function sendVaultRecoveryEmail(
  auth: Auth,
  email: string,
  continueUrl: string,
): Promise<void> {
  await sendPasswordResetEmail(auth, email, {
    url: continueUrl,
    handleCodeInApp: true,
  });
}

/** Returns the email address associated with the oobCode, or throws if expired/invalid. */
export async function verifyRecoveryCode(
  auth: Auth,
  oobCode: string,
): Promise<string> {
  return await verifyPasswordResetCode(auth, oobCode);
}

export async function confirmVaultRecovery(
  auth: Auth,
  oobCode: string,
  newAuthSecret: string,
): Promise<void> {
  await confirmPasswordReset(auth, oobCode, newAuthSecret);
}
