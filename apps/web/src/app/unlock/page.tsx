"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { secureLogger } from "@kryvex/security";
import { AuthCard } from "@/components/auth/AuthCard";
import { BiometricUnlockButton } from "@/components/auth/BiometricUnlockButton";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/button";
import { useVault } from "@/providers/VaultProvider";

/**
 * Screen 03 — Unlock Vault. See KRYVEX_UI_README.md §22 ("should feel
 * faster and calmer than onboarding — an everyday screen"). unlock()/
 * redirect logic is unchanged from the previous implementation.
 */
export default function UnlockPage() {
  const { state, unlock } = useVault();
  const router = useRouter();
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.status === "SIGNED_OUT") router.replace("/sign-in");
    if (state.status === "UNLOCKED") router.replace("/");
  }, [state.status, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await unlock(masterPassword);
      router.push("/");
    } catch {
      secureLogger.error("Unlock failed");
      setError("Incorrect master password.");
    } finally {
      setSubmitting(false);
    }
  }

  const user =
    state.status === "AUTHENTICATED_LOCKED" || state.status === "UNLOCKING"
      ? state.user
      : null;

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 sm:p-8">
      <AuthCard
        icon={Lock}
        title="Unlock Your Vault"
        description="Enter your master password to access your secure vault."
      >
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5"
          noValidate
        >
          {user && (
            <p className="-mt-2 text-center text-sm text-text-secondary">
              Signed in as {user.email}
            </p>
          )}

          <PasswordInput
            label="Master password"
            autoComplete="current-password"
            autoFocus
            required
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            error={error ?? undefined}
          />

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Unlocking…" : "Unlock"}
          </Button>

          <Link
            href="/recover"
            className="text-center text-sm text-text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Forgot password?
          </Link>

          <div className="mt-1 flex justify-center">
            <BiometricUnlockButton />
          </div>
        </form>
      </AuthCard>
    </main>
  );
}
