"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import { useVault } from "@/providers/VaultProvider";

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
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-xl font-semibold">Unlock your vault</h1>
        {user && (
          <p className="text-sm text-gray-500">Signed in as {user.email}</p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Master password
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
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
          {submitting ? "Unlocking…" : "Unlock"}
        </button>

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
