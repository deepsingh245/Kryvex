"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { secureLogger } from "@kryvex/security";
import type { SyncConflict } from "@kryvex/sync";
import { Button, Card } from "@kryvex/ui";
import { vaultItemDocumentSchema } from "@kryvex/validation";
import { BackLink } from "@/components/layout/BackLink";
import { useVaultItems, type ConflictResolution } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

/**
 * Sync conflict resolution — see docs/SYNC_ENGINE.md §7. Lists every
 * unresolved conflict (local vs. server version), always offering all
 * three resolutions (keep mine / keep server's / keep both) rather than
 * trying to auto-detect "unambiguous" merges — never silently loses data.
 * Gating (SIGNED_OUT/AUTHENTICATED_LOCKED redirects) now lives once in
 * ../layout.tsx, shared by every route in this group.
 */
export default function ConflictsPage() {
  const { state } = useVault();
  const { conflicts, importExternalConflict, resolveConflict } =
    useVaultItems();
  const [error, setError] = useState<string | null>(null);
  const importedFromExtension = useRef(new Set<string>());
  const importExternalConflictRef = useRef(importExternalConflict);

  useEffect(() => {
    importExternalConflictRef.current = importExternalConflict;
  }, [importExternalConflict]);

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("source") !== "extension"
    ) {
      return;
    }

    const requestId = crypto.randomUUID();
    function handleMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }
      const message = event.data as
        | {
            type?: string;
            requestId?: string;
            response?: {
              ok?: boolean;
              data?: unknown;
              error?: string;
            };
          }
        | undefined;
      if (
        message?.type !== "KRYVEX_EXTENSION_CONFLICT" ||
        message.requestId !== requestId
      ) {
        return;
      }
      const raw = message.response?.data as
        | { itemId?: unknown; localDoc?: unknown; serverDoc?: unknown }
        | null
        | undefined;
      if (!message.response?.ok || !raw) {
        setError(
          message.response?.error ??
            "The extension conflict could not be transferred.",
        );
        return;
      }
      const local = vaultItemDocumentSchema.safeParse(raw.localDoc);
      const server = vaultItemDocumentSchema.safeParse(raw.serverDoc);
      if (
        typeof raw.itemId !== "string" ||
        !local.success ||
        !server.success ||
        local.data.id !== raw.itemId ||
        server.data.id !== raw.itemId ||
        local.data.ownerId !== server.data.ownerId ||
        state.status !== "UNLOCKED" ||
        local.data.ownerId !== state.user.uid
      ) {
        setError("The extension returned an invalid conflict envelope.");
        return;
      }
      const conflict: SyncConflict = {
        itemId: raw.itemId,
        localDoc: local.data,
        serverDoc: server.data,
      };
      importedFromExtension.current.add(conflict.itemId);
      importExternalConflictRef.current(conflict);
    }

    window.addEventListener("message", handleMessage);
    window.postMessage(
      { type: "KRYVEX_EXTENSION_PULL_CONFLICT", requestId },
      window.location.origin,
    );
    return () => window.removeEventListener("message", handleMessage);
  }, [state]);

  async function handleResolve(itemId: string, resolution: ConflictResolution) {
    setError(null);
    try {
      await resolveConflict(itemId, resolution);
      if (importedFromExtension.current.has(itemId)) {
        window.postMessage(
          {
            type: "KRYVEX_EXTENSION_CONFLICT_RESOLVED",
            requestId: crypto.randomUUID(),
            conflictId: itemId,
          },
          window.location.origin,
        );
        importedFromExtension.current.delete(itemId);
      }
    } catch {
      secureLogger.error("Failed to resolve conflict", { itemId });
      setError("Unable to resolve that conflict. Please try again.");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <BackLink href="/" label="Back to vault" />
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
    </main>
  );
}
