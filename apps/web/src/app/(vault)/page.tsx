"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Alert,
  buttonVariants,
  EmptyState,
  SearchInput,
  Skeleton,
} from "@kryvex/ui";
import { selectVisibleItems } from "@kryvex/vault";
import { EmailDenseList } from "@/components/vault/EmailDenseList";
import { ItemCard } from "@/components/vault/ItemCard";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

const CATEGORY_HEADINGS: Record<string, string> = {
  login: "Logins",
  email: "Emails",
  secureNote: "Secure Notes",
  card: "Cards",
  identity: "Identities",
  apiKey: "API Keys",
  recoveryCodes: "Recovery Codes",
  files: "Files",
  governmentId: "Government IDs",
};

/**
 * Vault Home — renders the real item list (search/tag-filter/favorites via
 * @kryvex/vault's selectVisibleItems, an in-memory substring scan over
 * already-decrypted content — see docs/DATA_MODEL.md's search-index
 * decision). `favorites`/`type` come from the sidebar's nav links via the
 * URL (../layout.tsx renders the sidebar); `query`/tag pills stay local UI
 * state. Gating now lives once in ../layout.tsx.
 */
export default function Home() {
  const { settings } = useVault();
  const { items, loading, loadError, toggleFavorite, conflicts } =
    useVaultItems();
  const searchParams = useSearchParams();
  const favoritesOnly = searchParams.get("favorites") === "true";
  const typeFilter = searchParams.get("type");

  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);
  // Only relevant for the Email category — defaults to the dense view so
  // users can scan every email/password without clicking into each item.
  const [emailView, setEmailView] = useState<"dense" | "list">("dense");

  const visible = useMemo(() => {
    const base = selectVisibleItems(
      { items },
      { query, tagFilter, favoritesOnly },
    );
    if (!typeFilter) return base;
    if (typeFilter === "files") {
      return base.filter(
        (item) =>
          item.type === "image" || item.type === "pdf" || item.type === "file",
      );
    }
    return base.filter((item) => item.type === typeFilter);
  }, [items, query, tagFilter, favoritesOnly, typeFilter]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const item of items) {
      if (!item.decryptFailed) {
        for (const tag of item.content.tags) tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }, [items]);

  const heading = favoritesOnly
    ? "Favorites"
    : typeFilter
      ? (CATEGORY_HEADINGS[typeFilter] ?? "Your vault")
      : "Your vault";

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">{heading}</h1>
        <div className="flex items-center gap-3">
          <SearchInput
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-64"
          />
          <Link
            href={typeFilter ? `/item/new?type=${typeFilter}` : "/item/new"}
            className={buttonVariants({ variant: "primary" })}
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Add
          </Link>
        </div>
      </div>

      {typeFilter === "email" && (
        <div className="flex items-center gap-1 self-start rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setEmailView("dense")}
            className={
              emailView === "dense"
                ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-md px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:text-foreground"
            }
          >
            All at once
          </button>
          <button
            type="button"
            onClick={() => setEmailView("list")}
            className={
              emailView === "list"
                ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-md px-2.5 py-1 text-xs font-medium text-text-secondary transition-colors hover:text-foreground"
            }
          >
            One by one
          </button>
        </div>
      )}

      {loadError && <Alert variant="destructive">{loadError}</Alert>}

      {conflicts.length > 0 && (
        <Link href="/conflicts">
          <Alert variant="warning" className="transition-colors hover:bg-warning/15">
            {conflicts.length}{" "}
            {conflicts.length === 1 ? "item has" : "items have"} sync
            conflicts — Review
          </Alert>
        </Link>
      )}

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                setTagFilter((current) => (current === tag ? undefined : tag))
              }
              className={
                tagFilter === tag
                  ? "rounded-full border border-transparent bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:border-border-strong hover:text-foreground"
              }
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[60px] w-full rounded-lg" />
          ))}
        </div>
      )}

      {!loading && visible.length === 0 && (
        <EmptyState
          title={items.length === 0 ? "Your vault is empty." : "No items match your search."}
          description={
            items.length === 0
              ? "Add your first login, note, or file to get started."
              : "Try a different search term or clear your filters."
          }
        />
      )}

      {typeFilter === "email" && emailView === "dense" ? (
        <EmailDenseList
          items={visible}
          onToggleFavorite={(id) => void toggleFavorite(id)}
          clipboardClearSeconds={settings?.clipboardClearSeconds}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onToggleFavorite={() => void toggleFavorite(item.id)}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
