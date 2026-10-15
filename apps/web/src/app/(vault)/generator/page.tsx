"use client";

import { PasswordGeneratorPanel } from "@kryvex/ui";
import { BackLink } from "@/components/layout/BackLink";
import { useVault } from "@/providers/VaultProvider";

// Gating (SIGNED_OUT/AUTHENTICATED_LOCKED redirects) now lives once in
// ../layout.tsx, shared by every route in this group.
export default function GeneratorPage() {
  const { settings } = useVault();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <BackLink href="/" label="Back to vault" />
      <h1 className="text-2xl font-semibold text-foreground">
        Password Generator
      </h1>
      <PasswordGeneratorPanel
        clipboardClearSeconds={settings?.clipboardClearSeconds}
      />
    </main>
  );
}
