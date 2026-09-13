"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ItemTypeBadge, KRYVEX_BRAND_COLOR } from "@kryvex/ui";
import { selectVisibleItems } from "@kryvex/vault";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

/**
 * Vault Home — gated by LockState same as before Phase 4; now renders the
 * real item list (search/tag-filter/favorites via @kryvex/vault's
 * selectVisibleItems, an in-memory substring scan over already-decrypted
 * content — see docs/DATA_MODEL.md's search-index decision) instead of the
 * Phase 2/3 "your vault is empty" stub.
 */
export default function Home() {
  const { state, signOut } = useVault();
  const router = useRouter();
  const { items, loading, toggleFavorite, conflicts } = useVaultItems();
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  useEffect(() => {
    if (state.status === "SIGNED_OUT") router.replace("/sign-in");
    if (state.status === "AUTHENTICATED_LOCKED") router.replace("/unlock");
  }, [state.status, router]);

  const visible = useMemo(
    () => selectVisibleItems({ items }, { query, tagFilter, favoritesOnly }),
    [items, query, tagFilter, favoritesOnly],
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const item of items) {
      if (!item.decryptFailed) {
        for (const tag of item.content.tags) tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }, [items]);

  if (state.status === "UNLOCKED") {
    return (
      <main className="flex min-h-screen flex-1 flex-col gap-6 p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1
            className="text-2xl font-semibold"
            style={{ color: KRYVEX_BRAND_COLOR }}
          >
            Your vault
          </h1>
          <div className="flex gap-2">
            <Link
              href="/generator"
              className="rounded border px-4 py-2 text-sm font-medium"
            >
              Generator
            </Link>
            <Link
              href="/item/new"
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              + Add
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded border px-4 py-2 text-sm font-medium"
            >
              Sign out
            </button>
          </div>
        </div>

        {conflicts.length > 0 && (
          <Link
            href="/conflicts"
            className="rounded border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800"
          >
            {conflicts.length}{" "}
            {conflicts.length === 1 ? "item has" : "items have"} sync conflicts
            — Review
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
            />
            Favorites only
          </label>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                setTagFilter((current) => (current === tag ? undefined : tag))
              }
              className={`rounded-full border px-3 py-1 text-xs ${
                tagFilter === tag ? "bg-gray-900 text-white" : ""
              }`}
            >
              {tag}
            </button>
          ))}
        </div>

        {loading && <p className="text-sm text-gray-500">Loading…</p>}

        {!loading && visible.length === 0 && (
          <p className="text-sm text-gray-500">
            {items.length === 0
              ? "Your vault is empty."
              : "No items match your search."}
          </p>
        )}

        <ul className="flex flex-col gap-2">
          {visible.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded border p-3"
            >
              <Link
                href={`/item/${item.id}`}
                className="flex items-center gap-3"
              >
                <ItemTypeBadge type={item.type} />
                <span className="text-sm font-medium">
                  {item.decryptFailed
                    ? "Unable to decrypt"
                    : item.content.title}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void toggleFavorite(item.id)}
                aria-label={item.favorite ? "Unfavorite" : "Favorite"}
                className="text-lg"
              >
                {item.favorite ? "★" : "☆"}
              </button>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  // SIGNED_OUT / AUTHENTICATED_LOCKED redirect via the effect above;
  // UNLOCKING / LOCKING just show a spinner in the meantime.
  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
      <p className="text-sm text-gray-500">Loading…</p>
    </main>
  );
}
