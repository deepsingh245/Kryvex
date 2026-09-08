/**
 * Client side of the prelogin flow — see
 * docs/CRYPTOGRAPHIC_ARCHITECTURE.md §4.1 and
 * firebase/functions/src/getKdfParams.ts. Returns `unknown` on a hit; the
 * caller validates the shape (never trust data from the network
 * structurally), same convention as userProfile.ts.
 */

import { httpsCallable, type Functions } from "firebase/functions";

export async function resolveKdfParamsForEmail(
  functions: Functions,
  email: string,
): Promise<unknown | null> {
  const call = httpsCallable<{ email: string }, unknown | null>(
    functions,
    "getKdfParams",
  );
  const result = await call({ email });
  return result.data;
}
