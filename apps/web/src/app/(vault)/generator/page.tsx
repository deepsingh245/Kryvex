"use client";

import Link from "next/link";
import { PasswordGeneratorPanel } from "@kryvex/ui";
import { useVault } from "@/providers/VaultProvider";

// Gating (SIGNED_OUT/AUTHENTICATED_LOCKED redirects) now lives once in
// ../layout.tsx, shared by every route in this group.
export default function GeneratorPage() {
  const { settings } = useVault();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold text-foreground">
        Password Generator
      </h1>
      <PasswordGeneratorPanel
        clipboardClearSeconds={settings?.clipboardClearSeconds}
      />
      <Link
        href="/"
        className="text-sm text-text-secondary underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to vault
      </Link>
    </main>
  );
}
