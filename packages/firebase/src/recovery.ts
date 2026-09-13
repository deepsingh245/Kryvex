/**
 * Client side of the recovery-envelope callable — see
 * docs/RECOVERY.md §3 and firebase/functions/src/getRecoveryEnvelope.ts.
 * Returns `unknown` on a hit; the caller validates the shape (never trust
 * data from the network structurally), same convention as prelogin.ts.
 */

import { httpsCallable, type Functions } from "firebase/functions";

export async function resolveRecoveryEnvelopeForEmail(
  functions: Functions,
  email: string,
): Promise<unknown | null> {
  const call = httpsCallable<{ email: string }, unknown | null>(
    functions,
    "getRecoveryEnvelope",
  );
  const result = await call({ email });
  return result.data;
}
