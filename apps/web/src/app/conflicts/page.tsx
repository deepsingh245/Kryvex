"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import { useVaultItems, type ConflictResolution } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

/**
 * Sync conflict resolution — see docs/SYNC_ENGINE.md §7. Lists every
 * unresolved conflict (local vs. server version), always offering all
 * three resolutions (keep mine / keep server's / keep both) rather than
 * trying to auto-detect "unambiguous" merges — never silently loses data.
 */
export default function ConflictsPage() {
  const { state } = useVault();
  const router = useRouter();
  const { conflicts, resolveConflict } = useVaultItems();

  useEffect(() => {
    if (state.status === "SIGNED_OUT") router.replace("/sign-in");
    if (state.status === "AUTHENTICATED_LOCKED") router.replace("/unlock");
  }, [state.status, router]);

  if (state.status !== "UNLOCKED") {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  async function handleResolve(itemId: string, resolution: ConflictResolution) {
    try {
      await resolveConflict(itemId, resolution);
    } catch {
      secureLogger.error("Failed to resolve conflict", { itemId });
    }
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col gap-6 p-8">
      <h1 className="text-xl font-semibold">Sync conflicts</h1>

      {conflicts.length === 0 && (
        <p className="text-sm text-gray-500">No conflicts to review.</p>
      )}

      <ul className="flex flex-col gap-4">
        {conflicts.map((conflict) => (
          <li
            key={conflict.itemId}
            className="flex flex-col gap-3 rounded border p-4"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">
                  Your version
                </span>
                <span className="text-sm font-medium">
                  {conflict.localContent?.title ?? "Unable to decrypt"}
                </span>
                {conflict.localContent?.notes && (
                  <p className="text-xs text-gray-500">
                    {conflict.localContent.notes}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-500">
                  Server version
                </span>
                <span className="text-sm font-medium">
                  {conflict.serverContent?.title ?? "Unable to decrypt"}
                </span>
                {conflict.serverContent?.notes && (
                  <p className="text-xs text-gray-500">
                    {conflict.serverContent.notes}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleResolve(conflict.itemId, "keepMine")}
                className="rounded bg-gray-900 px-3 py-2 text-xs font-medium text-white"
              >
                Keep mine
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleResolve(conflict.itemId, "keepServer")
                }
                className="rounded border px-3 py-2 text-xs font-medium"
              >
                Keep server&apos;s
              </button>
              <button
                type="button"
                onClick={() => void handleResolve(conflict.itemId, "keepBoth")}
                className="rounded border px-3 py-2 text-xs font-medium"
              >
                Keep both
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Link href="/" className="text-sm text-gray-500 underline">
        Back to vault
      </Link>
    </main>
  );
}
