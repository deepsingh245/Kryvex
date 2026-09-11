"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PasswordGeneratorPanel } from "@kryvex/ui";
import { useVault } from "@/providers/VaultProvider";

// Gated the same way as every other route (SIGNED_OUT -> /sign-in) for UI
// consistency, even though generating a password needs no vault key.
export default function GeneratorPage() {
  const { state } = useVault();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "SIGNED_OUT") router.replace("/sign-in");
  }, [state.status, router]);

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-xl font-semibold">Password Generator</h1>
      <div className="w-full max-w-md">
        <PasswordGeneratorPanel />
      </div>
      <Link href="/" className="text-sm text-gray-500 underline">
        Back to vault
      </Link>
    </main>
  );
}
