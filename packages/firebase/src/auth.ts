/**
 * Thin Firebase Auth wrappers. Parameters are named `authSecret` throughout
 * — never `password` — as a deliberate guardrail: this value must always be
 * the HKDF-derived output from packages/crypto's deriveAuthAndStretchedKey,
 * never the raw master password. See docs/CRYPTOGRAPHIC_ARCHITECTURE.md §4.
 */

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
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
