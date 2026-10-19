"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Alert,
  buttonVariants,
  cn,
  EmptyState,
  SearchInput,
  Select,
  Sheet,
  Skeleton,
} from "@kryvex/ui";
import type { DecryptedVaultItem } from "@kryvex/vault";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useIsDesktopUp } from "@/hooks/useMediaQuery";
import { CredentialTable } from "./CredentialTable";
import { ItemDetailPane } from "./ItemDetailPane";
import { toDate } from "./itemMeta";
import { TypeSummary } from "./TypeSummary";

type SortKey = "recent" | "name";

interface VaultDashboardProps {
  heading: string;
  /** Every non-deleted item, unfiltered — drives the summary counts. */
  allItems: DecryptedVaultItem[];
  /** Items after search / tag / type / favorites filters. */
  visible: DecryptedVaultItem[];
  loading: boolean;
  loadError: string | null;
  conflictCount: number;
  query: string;
  onQueryChange: (value: string) => void;
  tags: string[];
  tagFilter: string | undefined;
  onTagFilterChange: (tag: string | undefined) => void;
  typeFilter: string | null;
  favoritesOnly: boolean;
  addHref: string;
  onToggleFavorite: (id: string) => void;
  clipboardClearSeconds?: number | undefined;
}

function titleOf(item: DecryptedVaultItem): string {
  return item.decryptFailed ? "" : item.content.title.toLowerCase();
}

/**
 * Tablet/desktop vault home (md and up): summary chips, credential table and,
 * from lg, an inline detail pane (a slide-over sheet on md). Mobile keeps the
 * original single-column list — see (vault)/page.tsx.
 */
export function VaultDashboard({
  heading,
  allItems,
  visible,
  loading,
  loadError,
  conflictCount,
  query,
  onQueryChange,
  tags,
  tagFilter,
  onTagFilterChange,
  typeFilter,
  favoritesOnly,
  addHref,
  onToggleFavorite,
  clipboardClearSeconds,
}: VaultDashboardProps) {
  const isDesktop = useIsDesktopUp();
  const [sort, setSort] = useState<SortKey>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...visible];
    if (sort === "name") {
      copy.sort((a, b) => titleOf(a).localeCompare(titleOf(b)));
    } else {
      copy.sort(
        (a, b) =>
          (toDate(b.updatedAt)?.getTime() ?? 0) -
          (toDate(a.updatedAt)?.getTime() ?? 0),
      );
    }
    return copy;
  }, [visible, sort]);

  // On desktop the pane always shows something sensible: the explicit pick,
  // else the first row. On tablet nothing opens until the user asks.
  const explicit = sorted.find((i) => i.id === selectedId) ?? null;
  const selected = explicit ?? (isDesktop ? (sorted[0] ?? null) : null);

  function handleSelect(id: string) {
    setSelectedId(id);
    if (!isDesktop) setSheetOpen(true);
  }

  const showEmpty = !loading && sorted.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-5 px-6 py-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
          <p className="text-sm text-text-secondary">
            {loading
              ? "Loading your vault…"
              : `${sorted.length} ${sorted.length === 1 ? "item" : "items"}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput
            placeholder="Search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="w-56 lg:w-72"
          />
          <Select
            aria-label="Sort items"
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            className="w-40"
          >
            <option value="recent">Recently updated</option>
            <option value="name">Name (A–Z)</option>
          </Select>
          <ThemeToggle />
          <Link
            href={addHref}
            className={buttonVariants({ variant: "primary" })}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add item
          </Link>
        </div>
      </div>

      <TypeSummary
        items={allItems}
        typeFilter={typeFilter}
        favoritesOnly={favoritesOnly}
      />

      {loadError && <Alert variant="destructive">{loadError}</Alert>}

      {conflictCount > 0 && (
        <Link href="/conflicts">
          <Alert
            variant="warning"
            className="transition-colors hover:bg-warning/15"
          >
            {conflictCount} {conflictCount === 1 ? "item has" : "items have"}{" "}
            sync conflicts — Review
          </Alert>
        </Link>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                onTagFilterChange(tagFilter === tag ? undefined : tag)
              }
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                tagFilter === tag
                  ? "border-transparent bg-primary text-primary-foreground"
                  : "border-border text-text-secondary hover:border-border-strong hover:text-foreground",
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 items-start gap-6">
        <div className="min-w-0 flex-1">
          {loading && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[60px] w-full rounded-lg" />
              ))}
            </div>
          )}

          {showEmpty && (
            <EmptyState
              title={
                allItems.length === 0
                  ? "Your vault is empty."
                  : "No items match your search."
              }
              description={
                allItems.length === 0
                  ? "Add your first login, note, or file to get started."
                  : "Try a different search term or clear your filters."
              }
            />
          )}

          {!loading && sorted.length > 0 && (
            <CredentialTable
              items={sorted}
              selectedId={selected?.id ?? null}
              onSelect={handleSelect}
              onToggleFavorite={onToggleFavorite}
              clipboardClearSeconds={clipboardClearSeconds}
            />
          )}
        </div>

        {isDesktop && !loading && sorted.length > 0 && (
          <aside className="sticky top-6 w-[22rem] shrink-0 xl:w-[26rem]">
            <ItemDetailPane
              item={selected}
              onToggleFavorite={onToggleFavorite}
              clipboardClearSeconds={clipboardClearSeconds}
            />
          </aside>
        )}
      </div>

      {!isDesktop && (
        <Sheet
          open={sheetOpen && explicit !== null}
          onOpenChange={setSheetOpen}
          title="Item details"
          side="right"
          className="max-w-md overflow-y-auto"
        >
          <ItemDetailPane
            item={explicit}
            onToggleFavorite={onToggleFavorite}
            clipboardClearSeconds={clipboardClearSeconds}
            className="border-0 bg-transparent p-0 shadow-none"
          />
        </Sheet>
      )}
    </main>
  );
}
