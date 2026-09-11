import { describe, expect, it } from "vitest";
import {
  initialItemCacheState,
  itemCacheReducer,
  selectVisibleItems,
  type DecryptedVaultItem,
  type ItemCacheState,
} from "./itemCacheReducer";

function envelope() {
  return {
    v: 1 as const,
    alg: "AES-256-GCM" as const,
    nonce: "n",
    ciphertext: "c",
  };
}

function loginItem(
  overrides: Partial<DecryptedVaultItem> & {
    id: string;
    title?: string;
    tags?: string[];
    notes?: string;
  },
): DecryptedVaultItem {
  const { title = "Item", tags = [], notes, ...rest } = overrides;
  return {
    ownerId: "alice",
    type: "login",
    revision: 0,
    updatedAt: null,
    createdAt: null,
    deleted: false,
    favorite: false,
    wrappedItemKey: envelope(),
    encryptedData: envelope(),
    attachmentRefs: [],
    decryptFailed: false,
    content: {
      type: "login",
      title,
      tags,
      notes,
      customFields: [],
      username: "u",
      password: "p",
      websites: [],
    },
    ...rest,
  } as DecryptedVaultItem;
}

function decryptFailedItem(
  overrides: Partial<DecryptedVaultItem> & { id: string },
): DecryptedVaultItem {
  return {
    ownerId: "alice",
    type: "login",
    revision: 0,
    updatedAt: null,
    createdAt: null,
    deleted: false,
    favorite: false,
    wrappedItemKey: envelope(),
    encryptedData: envelope(),
    attachmentRefs: [],
    decryptFailed: true,
    ...overrides,
  } as DecryptedVaultItem;
}

describe("itemCacheReducer", () => {
  it("starts empty", () => {
    expect(initialItemCacheState).toEqual({ items: [] });
  });

  it("ITEMS_LOADED replaces the whole item list", () => {
    const a = loginItem({ id: "1" });
    const b = loginItem({ id: "2" });
    const state = itemCacheReducer(initialItemCacheState, {
      type: "ITEMS_LOADED",
      items: [a, b],
    });
    expect(state.items).toEqual([a, b]);

    const c = loginItem({ id: "3" });
    const nextState = itemCacheReducer(state, {
      type: "ITEMS_LOADED",
      items: [c],
    });
    expect(nextState.items).toEqual([c]);
  });

  it("ITEM_UPSERTED appends a new item", () => {
    const a = loginItem({ id: "1" });
    const state = itemCacheReducer(initialItemCacheState, {
      type: "ITEM_UPSERTED",
      item: a,
    });
    expect(state.items).toEqual([a]);
  });

  it("ITEM_UPSERTED replaces an existing item by id", () => {
    const a = loginItem({ id: "1", title: "Old" });
    const initial: ItemCacheState = { items: [a] };
    const updated = loginItem({ id: "1", title: "New" });
    const state = itemCacheReducer(initial, {
      type: "ITEM_UPSERTED",
      item: updated,
    });
    expect(state.items).toEqual([updated]);
  });

  it("CACHE_CLEARED resets to the initial empty state", () => {
    const state: ItemCacheState = { items: [loginItem({ id: "1" })] };
    expect(itemCacheReducer(state, { type: "CACHE_CLEARED" })).toEqual(
      initialItemCacheState,
    );
  });
});

describe("selectVisibleItems", () => {
  it("excludes tombstoned (deleted) items", () => {
    const state: ItemCacheState = {
      items: [loginItem({ id: "1", deleted: true }), loginItem({ id: "2" })],
    };
    expect(selectVisibleItems(state).map((i) => i.id)).toEqual(["2"]);
  });

  it("filters by case-insensitive title/tag/notes substring match", () => {
    const state: ItemCacheState = {
      items: [
        loginItem({ id: "1", title: "GitHub Login" }),
        loginItem({ id: "2", title: "Bank" }),
        loginItem({ id: "3", title: "Other", tags: ["github"] }),
        loginItem({ id: "4", title: "Other2", notes: "my GitHub account" }),
      ],
    };
    const results = selectVisibleItems(state, { query: "github" }).map(
      (i) => i.id,
    );
    expect(results.sort()).toEqual(["1", "3", "4"]);
  });

  it("empty query returns everything (minus tombstones)", () => {
    const state: ItemCacheState = {
      items: [loginItem({ id: "1" }), loginItem({ id: "2" })],
    };
    expect(selectVisibleItems(state, { query: "" })).toHaveLength(2);
  });

  it("favoritesOnly filters to favorite:true items", () => {
    const state: ItemCacheState = {
      items: [
        loginItem({ id: "1", favorite: true }),
        loginItem({ id: "2", favorite: false }),
      ],
    };
    expect(
      selectVisibleItems(state, { favoritesOnly: true }).map((i) => i.id),
    ).toEqual(["1"]);
  });

  it("tagFilter matches items whose content.tags includes the tag", () => {
    const state: ItemCacheState = {
      items: [
        loginItem({ id: "1", tags: ["work"] }),
        loginItem({ id: "2", tags: ["personal"] }),
      ],
    };
    expect(
      selectVisibleItems(state, { tagFilter: "work" }).map((i) => i.id),
    ).toEqual(["1"]);
  });

  it("a decryptFailed item is still visible under an empty/no filter and respects favoritesOnly", () => {
    const state: ItemCacheState = {
      items: [decryptFailedItem({ id: "1", favorite: true })],
    };
    expect(selectVisibleItems(state)).toHaveLength(1);
    expect(selectVisibleItems(state, { favoritesOnly: true })).toHaveLength(1);
    expect(
      selectVisibleItems(state, { favoritesOnly: false, query: "anything" }),
    ).toHaveLength(1);
  });

  it("a decryptFailed item is hidden under an active tagFilter (content unreadable)", () => {
    const state: ItemCacheState = {
      items: [decryptFailedItem({ id: "1" })],
    };
    expect(selectVisibleItems(state, { tagFilter: "work" })).toHaveLength(0);
  });
});
