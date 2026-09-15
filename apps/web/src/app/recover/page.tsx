"use client";

import { KeyRound, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  initializeKryvexFirebase,
  sendVaultRecoveryEmail,
} from "@kryvex/firebase";
import { secureLogger } from "@kryvex/security";
import { Button, Input, Label } from "@kryvex/ui";
import { AuthCard } from "@/components/auth/AuthCard";
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
  const router = useRouter();
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
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 sm:p-8">
        <AuthCard icon={MailCheck} title="Check your email">
          <p className="text-sm text-text-secondary">
            If an account exists for {email}, we&apos;ve sent a link to
            continue recovering your vault. Follow it to enter your Recovery
            Key and set a new master password.
          </p>
          <Link
            href="/sign-in"
            className="mt-5 block text-center text-sm text-text-secondary underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </AuthCard>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 sm:p-8">
      <AuthCard
        icon={KeyRound}
        title="Recover your vault"
        description="Enter your account email. We'll send a link to continue — you'll need your Emergency Kit's Recovery Key on the next step."
        onBack={() => router.push("/sign-in")}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Sending…" : "Send recovery link"}
          </Button>

          <Link
            href="/sign-in"
            className="text-center text-sm text-text-secondary underline-offset-4 hover:text-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </form>
      </AuthCard>
    </main>
  );
}
