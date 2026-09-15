"use client";

import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { signInFormSchema } from "@kryvex/validation";
import { secureLogger } from "@kryvex/security";
import { Button, Input, Label } from "@kryvex/ui";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useVault } from "@/providers/VaultProvider";

// Deliberately generic — never reveal whether the email or the password was
// wrong (see docs/CRYPTOGRAPHIC_ARCHITECTURE.md §4.1's email-enumeration note).
const GENERIC_ERROR = "Invalid email or password.";

export default function SignInPage() {
  const { signIn } = useVault();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = signInFormSchema.safeParse({ email, masterPassword });
    if (!parsed.success) {
      setError(GENERIC_ERROR);
      return;
    }

    setSubmitting(true);
    try {
      await signIn(parsed.data.email, parsed.data.masterPassword);
      router.push("/");
    } catch {
      secureLogger.error("Sign-in failed", { email: parsed.data.email });
      setError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 sm:p-8">
      <AuthCard
        icon={LogIn}
        title="Sign in to Kryvex"
        description="Enter your email and master password to continue."
        onBack={() => router.push("/welcome")}
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

          <PasswordInput
            label="Master password"
            autoComplete="current-password"
            required
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </Button>

          <div className="flex flex-col items-center gap-2">
            <Link
              href="/sign-up"
              className="text-sm text-text-secondary underline-offset-4 hover:text-foreground hover:underline"
            >
              Need a vault? Create one
            </Link>
            <Link
              href="/recover"
              className="text-sm text-text-secondary underline-offset-4 hover:text-foreground hover:underline"
            >
              Forgot your master password?
            </Link>
          </div>
        </form>
      </AuthCard>
    </main>
  );
}
