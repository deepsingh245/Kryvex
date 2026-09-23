"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { secureLogger } from "@kryvex/security";
import { Button, Card } from "@kryvex/ui";
import { useVaultItems, type ConflictResolution } from "@/hooks/useVaultItems";

/**
 * Sync conflict resolution — see docs/SYNC_ENGINE.md §7. Lists every
 * unresolved conflict (local vs. server version), always offering all
 * three resolutions (keep mine / keep server's / keep both) rather than
 * trying to auto-detect "unambiguous" merges — never silently loses data.
 * Gating (SIGNED_OUT/AUTHENTICATED_LOCKED redirects) now lives once in
 * ../layout.tsx, shared by every route in this group.
 */
export default function ConflictsPage() {
  const { conflicts, resolveConflict } = useVaultItems();
  const [error, setError] = useState<string | null>(null);

  async function handleResolve(itemId: string, resolution: ConflictResolution) {
    setError(null);
    try {
      await resolveConflict(itemId, resolution);
    } catch {
      secureLogger.error("Failed to resolve conflict", { itemId });
      setError("Unable to resolve that conflict. Please try again.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Sync conflicts</h1>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {conflicts.length === 0 && (
        <p className="text-sm text-text-secondary">No conflicts to review.</p>
      )}

      <ul className="flex flex-col gap-4">
        {conflicts.map((conflict) => (
          <li key={conflict.itemId}>
            <Card className="flex flex-col gap-4 p-4">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-4 w-4" strokeWidth={1.75} />
                <span className="text-xs font-medium uppercase tracking-wide">
                  Sync conflict
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-secondary">
                    Your version
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {conflict.localContent?.title ?? "Unable to decrypt"}
                  </span>
                  {conflict.localContent?.notes && (
                    <p className="text-xs text-text-secondary">
                      {conflict.localContent.notes}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-text-secondary">
                    Server version
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {conflict.serverContent?.title ?? "Unable to decrypt"}
                  </span>
                  {conflict.serverContent?.notes && (
                    <p className="text-xs text-text-secondary">
                      {conflict.serverContent.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    void handleResolve(conflict.itemId, "keepMine")
                  }
                >
                  Keep mine
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void handleResolve(conflict.itemId, "keepServer")
                  }
                >
                  Keep server&apos;s
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void handleResolve(conflict.itemId, "keepBoth")
                  }
                >
                  Keep both
                </Button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Link
        href="/"
        className="text-sm text-text-secondary underline-offset-4 hover:text-foreground hover:underline"
      >
        Back to vault
      </Link>
    </main>
  );
}
