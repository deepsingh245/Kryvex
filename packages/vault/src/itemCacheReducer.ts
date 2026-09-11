/**
 * In-memory decrypted item cache — the "Phase 4 adds decrypted item cache
 * handles" extension point earmarked in lockStateMachine.ts. Pure
 * TypeScript, same zero-Firebase-dependency/zero-React-dependency design as
 * lockStateReducer: apps/web's useVaultItems hook owns the Firestore I/O
 * and dispatches into this reducer.
 *
 * No offline persistence here (Phase 5) — items live in this reducer's
 * state only for the UNLOCKED session; CACHE_CLEARED must be dispatched
 * whenever lock state leaves UNLOCKED (see docs/SECURITY_THREAT_MODEL.md —
 * decrypted plaintext should not outlive the unlocked session in memory).
 */

import type { ItemContent, VaultItemDocument } from "@kryvex/types";

// A per-item decrypt failure (tampered/corrupted document) is isolated to
// that one item — it must never blank the whole list or throw out of the
// load path.
export type DecryptedVaultItem =
  | (VaultItemDocument & { decryptFailed: false; content: ItemContent })
  | (VaultItemDocument & { decryptFailed: true });

export interface ItemCacheState {
  items: DecryptedVaultItem[];
}

export type ItemCacheAction =
  | { type: "ITEMS_LOADED"; items: DecryptedVaultItem[] }
  | { type: "ITEM_UPSERTED"; item: DecryptedVaultItem }
  | { type: "CACHE_CLEARED" };

export const initialItemCacheState: ItemCacheState = { items: [] };

export function itemCacheReducer(
  state: ItemCacheState,
  action: ItemCacheAction,
): ItemCacheState {
  switch (action.type) {
    case "ITEMS_LOADED":
      return { items: action.items };

    case "ITEM_UPSERTED": {
      const index = state.items.findIndex((i) => i.id === action.item.id);
      if (index === -1) {
        return { items: [...state.items, action.item] };
      }
      const items = [...state.items];
      items[index] = action.item;
      return { items };
    }

    case "CACHE_CLEARED":
      return initialItemCacheState;

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export interface VisibleItemsFilter {
  query?: string | undefined;
  tagFilter?: string | undefined;
  favoritesOnly?: boolean | undefined;
}

/**
 * Tombstones (deleted:true) are never visible. A decryptFailed item can't
 * be searched or tag-filtered (its content is unreadable) but still passes
 * favoritesOnly — favorite is envelope-level plaintext, readable either
 * way — and an active free-text search, so the user still sees "something
 * is here and broken" rather than it silently vanishing; an active
 * tagFilter does hide it, since we cannot know whether it matches.
 */
export function selectVisibleItems(
  state: ItemCacheState,
  filter: VisibleItemsFilter = {},
): DecryptedVaultItem[] {
  const query = filter.query?.trim().toLowerCase();

  return state.items.filter((item) => {
    if (item.deleted) return false;
    if (filter.favoritesOnly && !item.favorite) return false;

    if (item.decryptFailed) {
      return !filter.tagFilter;
    }

    if (filter.tagFilter && !item.content.tags.includes(filter.tagFilter)) {
      return false;
    }

    if (query) {
      const haystack = [
        item.content.title,
        item.content.notes ?? "",
        ...item.content.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}
