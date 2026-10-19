"use client";

import Link from "next/link";
import { cn, getItemTypeIcon, ITEM_TYPE_LABELS } from "@kryvex/ui";
import type { DecryptedVaultItem } from "@kryvex/vault";
import { Files, Layers, Star } from "lucide-react";

interface TypeSummaryProps {
  /** Every non-deleted item (unfiltered) — counts reflect the whole vault. */
  items: DecryptedVaultItem[];
  typeFilter: string | null;
  favoritesOnly: boolean;
}

const ATTACHMENT_TYPES = new Set(["image", "pdf", "file"]);

function Chip({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active: boolean;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border bg-card text-text-secondary hover:border-border-strong hover:text-foreground",
      )}
    >
      {children}
      <span
        className={cn(
          "rounded-md px-1.5 py-0.5 font-mono text-xs",
          active ? "bg-primary/15" : "bg-surface-2 text-text-muted",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

/**
 * At-a-glance counts by item type, doubling as quick filters. Real vault data
 * only — every number is derived from the already-decrypted local item list.
 */
export function TypeSummary({
  items,
  typeFilter,
  favoritesOnly,
}: TypeSummaryProps) {
  const counts = new Map<string, number>();
  let files = 0;
  let favorites = 0;
  for (const item of items) {
    if (item.favorite) favorites += 1;
    if (ATTACHMENT_TYPES.has(item.type)) {
      files += 1;
      continue;
    }
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
  }

  return (
    <nav
      aria-label="Filter by item type"
      className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      <Chip
        href="/"
        active={!typeFilter && !favoritesOnly}
        count={items.length}
      >
        <Layers className="h-4 w-4" strokeWidth={1.75} />
        All
      </Chip>
      <Chip href="/?favorites=true" active={favoritesOnly} count={favorites}>
        <Star className="h-4 w-4" strokeWidth={1.75} />
        Favorites
      </Chip>
      {Array.from(counts.entries()).map(([type, count]) => {
        const Icon = getItemTypeIcon(type as DecryptedVaultItem["type"]);
        return (
          <Chip
            key={type}
            href={`/?type=${type}`}
            active={typeFilter === type}
            count={count}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {ITEM_TYPE_LABELS[type as DecryptedVaultItem["type"]]}
          </Chip>
        );
      })}
      {files > 0 && (
        <Chip href="/?type=files" active={typeFilter === "files"} count={files}>
          <Files className="h-4 w-4" strokeWidth={1.75} />
          Files
        </Chip>
      )}
    </nav>
  );
}
