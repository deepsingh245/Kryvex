import type { AuthenticatedUser } from "@kryvex/types";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
  type User,
} from "firebase/auth/web-extension";

function toKryvexUser(user: User): AuthenticatedUser {
  return { uid: user.uid, email: user.email ?? "" };
}

export async function signInWithAuthSecretExtension(
  auth: Auth,
  email: string,
  authSecret: string,
): Promise<AuthenticatedUser> {
  const credential = await signInWithEmailAndPassword(auth, email, authSecret);
  return toKryvexUser(credential.user);
}

export function observeExtensionAuthState(
  auth: Auth,
  onChange: (user: AuthenticatedUser | null) => void,
): () => void {
  return onAuthStateChanged(auth, (user) =>
    onChange(user ? toKryvexUser(user) : null),
  );
}

export async function signOutKryvexExtension(auth: Auth): Promise<void> {
  await signOut(auth);
}
