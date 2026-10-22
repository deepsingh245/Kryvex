"use client";

import { Check, Copy, KeyRound, Star, User } from "lucide-react";
import { cn, getItemTypeIcon } from "@kryvex/ui";
import type { DecryptedVaultItem } from "@kryvex/vault";
import {
  formatUpdated,
  getCopyablePassword,
  getCopyableUsername,
  getItemHost,
  getItemSubtitle,
} from "./itemMeta";
import { useCopyToClipboard } from "./useCopyToClipboard";

interface CredentialTableProps {
  items: DecryptedVaultItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  clipboardClearSeconds?: number | undefined;
}

const ACTION_BUTTON =
  "flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const HOVER_REVEAL =
  "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100";

function ItemIcon({ type }: { type: DecryptedVaultItem["type"] }) {
  const Icon = getItemTypeIcon(type);
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Icon className="h-4 w-4" strokeWidth={1.75} />
    </span>
  );
}

/**
 * Desktop/tablet credential table. Passwords are never rendered here — the
 * quick action copies straight to the clipboard (auto-cleared) and the detail
 * pane reveals them behind SecretField's masked-by-default control.
 */
export function CredentialTable({
  items,
  selectedId,
  onSelect,
  onToggleFavorite,
  clipboardClearSeconds,
}: CredentialTableProps) {
  const { copy, copiedKey } = useCopyToClipboard(clipboardClearSeconds);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full table-fixed border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-2/60 text-xs uppercase tracking-wide text-text-muted">
            <th scope="col" className="px-4 py-3 font-medium">
              Name
            </th>
            <th
              scope="col"
              className="hidden w-48 px-3 py-3 font-medium xl:table-cell"
            >
              Website
            </th>
            <th
              scope="col"
              className="hidden w-28 px-3 py-3 font-medium lg:table-cell"
            >
              Updated
            </th>
            <th scope="col" className="w-[7.5rem] px-3 py-3 text-right">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => {
            const selected = item.id === selectedId;
            const title = item.decryptFailed
              ? "Unable to decrypt"
              : item.content.title;
            const username = getCopyableUsername(item);
            const password = getCopyablePassword(item);
            return (
              <tr
                key={item.id}
                aria-selected={selected}
                onClick={() => onSelect(item.id)}
                className={cn(
                  "group cursor-pointer transition-colors",
                  selected ? "bg-primary/10" : "hover:bg-surface-2/60",
                )}
              >
                <td className="px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <ItemIcon type={item.type} />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(item.id);
                        }}
                        className="block max-w-full truncate rounded font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {title}
                      </button>
                      <p className="truncate text-xs text-text-secondary">
                        {getItemSubtitle(item)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="hidden truncate px-3 py-2.5 text-text-secondary xl:table-cell">
                  {getItemHost(item) ?? "—"}
                </td>
                <td className="hidden px-3 py-2.5 text-xs text-text-muted lg:table-cell">
                  {formatUpdated(item.updatedAt)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-end gap-0.5">
                    {username && (
                      <button
                        type="button"
                        aria-label={`Copy username for ${title}`}
                        title="Copy username"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copy(`u:${item.id}`, username);
                        }}
                        className={cn(ACTION_BUTTON, HOVER_REVEAL)}
                      >
                        {copiedKey === `u:${item.id}` ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <User className="h-4 w-4" strokeWidth={1.75} />
                        )}
                      </button>
                    )}
                    {password && (
                      <button
                        type="button"
                        aria-label={`Copy password for ${title}`}
                        title="Copy password"
                        onClick={(e) => {
                          e.stopPropagation();
                          void copy(`p:${item.id}`, password);
                        }}
                        className={cn(ACTION_BUTTON, HOVER_REVEAL)}
                      >
                        {copiedKey === `p:${item.id}` ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={item.favorite ? "Unfavorite" : "Favorite"}
                      aria-pressed={item.favorite}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(item.id);
                      }}
                      className={ACTION_BUTTON}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          item.favorite && "text-warning",
                        )}
                        strokeWidth={1.75}
                        fill={item.favorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="flex items-center gap-1.5 border-t border-border px-4 py-2 text-xs text-text-muted">
        <Copy className="h-3 w-3" aria-hidden="true" />
        Copied values are cleared from your clipboard automatically.
      </p>
    </div>
  );
}
