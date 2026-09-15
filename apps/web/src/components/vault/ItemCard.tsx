"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import type { DecryptedVaultItem } from "@kryvex/vault";
import { cn, getItemTypeIcon } from "@kryvex/ui";

interface ItemCardProps {
  item: DecryptedVaultItem;
  onToggleFavorite: () => void;
}

export function ItemCard({ item, onToggleFavorite }: ItemCardProps) {
  // getItemTypeIcon is a pure lookup returning one of a fixed set of
  // module-level Lucide components (never creates one) — the React
  // Compiler's static analysis can't see that through the function call,
  // hence the disable below. See
  // packages/ui/src/components/ItemTypeBadge.tsx, which does the same
  // lookup (that package isn't linted with this rule).
  const Icon = getItemTypeIcon(item.type);

  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-border-strong">
      <Link
        href={`/item/${item.id}`}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-2">
          {/* eslint-disable-next-line react-hooks/static-components */}
          <Icon className="h-4.5 w-4.5 text-text-secondary" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {item.decryptFailed ? "Unable to decrypt" : item.content.title}
        </span>
      </Link>
      <button
        type="button"
        onClick={onToggleFavorite}
        aria-label={item.favorite ? "Unfavorite" : "Favorite"}
        aria-pressed={item.favorite}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Star
          className={cn("h-4.5 w-4.5", item.favorite && "text-warning")}
          strokeWidth={1.75}
          fill={item.favorite ? "currentColor" : "none"}
        />
      </button>
    </li>
  );
}
