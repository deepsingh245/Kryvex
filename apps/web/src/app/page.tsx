"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { KRYVEX_BRAND_COLOR } from "@kryvex/ui";
import { useVault } from "@/providers/VaultProvider";

/**
 * Gated home — redirects based on LockState. Phase 2 scope only: once
 * UNLOCKED there's no vault content yet (Phase 4), just a stub. Recovery
 * kit / biometric opt-in (build spec §54, Phase 3/7) would insert here,
 * between a fresh sign-up's UNLOCK_SUCCEEDED and landing on this screen —
 * not built yet.
 */
export default function Home() {
  const { state, signOut } = useVault();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "SIGNED_OUT") router.replace("/sign-in");
    if (state.status === "AUTHENTICATED_LOCKED") router.replace("/unlock");
  }, [state.status, router]);

  if (state.status === "UNLOCKED") {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <h1
          className="text-2xl font-semibold"
          style={{ color: KRYVEX_BRAND_COLOR }}
        >
          Your vault is empty
        </h1>
        <p className="text-sm text-gray-500">
          Signed in as {state.user.email} — no items yet (Phase 4 work).
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="rounded border px-4 py-2 text-sm font-medium"
        >
          Sign out
        </button>
      </main>
    );
  }

  // SIGNED_OUT / AUTHENTICATED_LOCKED redirect via the effect above;
  // UNLOCKING / LOCKING just show a spinner in the meantime.
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
      <p className="text-sm text-gray-500">Loading…</p>
    </main>
  );
}
