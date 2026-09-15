"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MobileTopBar } from "@/components/layout/MobileTopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { useVault } from "@/providers/VaultProvider";

/**
 * Shared shell for every authenticated route (Vault Home, Item Detail/Edit/
 * New, Generator, Settings, Conflicts) — desktop sidebar + mobile top bar,
 * per KRYVEX_UI_README.md §16. Also the single place the SIGNED_OUT/
 * AUTHENTICATED_LOCKED redirect gate lives now; each of the ~7 pages this
 * group replaces used to duplicate this exact effect.
 */
export default function VaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { state } = useVault();
  const router = useRouter();

  useEffect(() => {
    if (state.status === "SIGNED_OUT") router.replace("/welcome");
    if (state.status === "AUTHENTICATED_LOCKED") router.replace("/unlock");
  }, [state.status, router]);

  if (state.status !== "UNLOCKED") {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-text-secondary">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
