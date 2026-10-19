"use client";

import { ExternalLink, Pencil, Star } from "lucide-react";
import Link from "next/link";
import { buttonVariants, cn, ItemTypeBadge } from "@kryvex/ui";
import type { DecryptedVaultItem } from "@kryvex/vault";
import { ItemDetailBody } from "@/components/vault/ItemDetailBody";
import { formatUpdated } from "./itemMeta";

interface ItemDetailPaneProps {
  item: DecryptedVaultItem | null;
  onToggleFavorite: (id: string) => void;
  clipboardClearSeconds?: number | undefined;
  className?: string;
}

/** Right-hand detail panel (lg+) / sheet content (md) for the selected item. */
export function ItemDetailPane({
  item,
  onToggleFavorite,
  clipboardClearSeconds,
  className,
}: ItemDetailPaneProps) {
  if (!item) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-8 text-center",
          className,
        )}
      >
        <p className="text-sm font-medium text-foreground">No item selected</p>
        <p className="text-sm text-text-secondary">
          Pick a credential from the list to see its details.
        </p>
      </div>
    );
  }

  const updated = formatUpdated(item.updatedAt);

  return (
    <section
      aria-label="Item details"
      className={cn(
        "flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 className="truncate text-lg font-semibold text-foreground">
            {item.decryptFailed ? "Unable to decrypt" : item.content.title}
          </h2>
          <div className="flex items-center gap-2">
            <ItemTypeBadge type={item.type} />
            {updated && (
              <span className="text-xs text-text-muted">Updated {updated}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite(item.id)}
          aria-label={item.favorite ? "Unfavorite" : "Favorite"}
          aria-pressed={item.favorite}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star
            className={cn("h-[18px] w-[18px]", item.favorite && "text-warning")}
            strokeWidth={1.75}
            fill={item.favorite ? "currentColor" : "none"}
          />
        </button>
      </header>

      <ItemDetailBody
        item={item}
        clipboardClearSeconds={clipboardClearSeconds}
      />

      <footer className="flex gap-2 border-t border-border pt-4">
        <Link
          href={`/item/${item.id}/edit`}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
          Edit
        </Link>
        <Link
          href={`/item/${item.id}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
          Open full page
        </Link>
      </footer>
    </section>
  );
}
