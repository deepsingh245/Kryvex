"use client";

import { useState, type FormEvent } from "react";
import {
  initializeKryvexFirebase,
  sendVaultRecoveryEmail,
} from "@kryvex/firebase";
import { secureLogger } from "@kryvex/security";
import {
  webFirebaseConfig,
  webFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";

// See providers/VaultProvider.tsx's own getServices() comment: lazy,
// client-only. This page doesn't touch lock state, so it talks to
// @kryvex/firebase directly rather than through VaultProvider.
function getServices() {
  return initializeKryvexFirebase(webFirebaseConfig, webFirebaseEmulatorEnv);
}

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const services = getServices();
      await sendVaultRecoveryEmail(
        services.auth,
        email,
        `${window.location.origin}/recover/confirm`,
      );
    } catch {
      // Never reveal whether the account exists — same posture as
      // getKdfParams/getRecoveryEnvelope. A genuine error (e.g. network)
      // gets the same generic outcome the user sees either way.
      secureLogger.error("Failed to send recovery email");
    } finally {
      // Always show the same confirmation, whether or not the account
      // exists or the email actually went out — same non-distinguishing
      // philosophy as the rest of the recovery flow.
      setSubmitting(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
        <div className="flex w-full max-w-sm flex-col gap-4 text-center">
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-gray-500">
            If an account exists for {email}, we&apos;ve sent a link to continue
            recovering your vault. Follow it to enter your Recovery Key and set
            a new master password.
          </p>
          <a href="/sign-in" className="text-sm text-gray-500 underline">
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-xl font-semibold">Recover your vault</h1>
        <p className="text-sm text-gray-500">
          Enter your account email. We&apos;ll send a link to continue —
          you&apos;ll need your Emergency Kit&apos;s Recovery Key on the next
          step.
        </p>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            autoComplete="email"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send recovery link"}
        </button>

        <a
          href="/sign-in"
          className="text-center text-sm text-gray-500 underline"
        >
          Back to sign in
        </a>
      </form>
    </main>
  );
}
