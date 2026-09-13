"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInFormSchema } from "@kryvex/validation";
import { secureLogger } from "@kryvex/security";
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
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-xl font-semibold">Sign in to Kryvex</h1>

        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Master password
          <input
            type="password"
            autoComplete="current-password"
            required
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>

        <a
          href="/sign-up"
          className="text-center text-sm text-gray-500 underline"
        >
          Need a vault? Create one
        </a>
        <a
          href="/recover"
          className="text-center text-sm text-gray-500 underline"
        >
          Forgot your master password?
        </a>
      </form>
    </main>
  );
}
