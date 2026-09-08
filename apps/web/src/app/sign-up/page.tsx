"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signUpFormSchema } from "@kryvex/validation";
import { secureLogger } from "@kryvex/security";
import { useVault } from "@/providers/VaultProvider";

export default function SignUpPage() {
  const { signUp } = useVault();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const parsed = signUpFormSchema.safeParse({
      email,
      masterPassword,
      confirmMasterPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setSubmitting(true);
    try {
      await signUp(parsed.data.email, parsed.data.masterPassword);
      router.push("/");
    } catch (err) {
      secureLogger.error("Sign-up failed", { email: parsed.data.email });
      setError(
        err instanceof Error
          ? err.message
          : "Sign-up failed. Please try again.",
      );
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
        <h1 className="text-xl font-semibold">Create your Kryvex vault</h1>
        <p className="text-sm text-gray-500">
          Your master password protects your vault. Kryvex cannot simply send it
          to the server and recover your vault for you — if you lose it, your
          data may be unrecoverable.
        </p>

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
            autoComplete="new-password"
            required
            value={masterPassword}
            onChange={(e) => setMasterPassword(e.target.value)}
            className="rounded border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Confirm master password
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmMasterPassword}
            onChange={(e) => setConfirmMasterPassword(e.target.value)}
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
          {submitting ? "Creating vault…" : "Create vault"}
        </button>

        <a
          href="/sign-in"
          className="text-center text-sm text-gray-500 underline"
        >
          Already have a vault? Sign in
        </a>
      </form>
    </main>
  );
}
