"use client";

import { useEffect, useReducer, useTransition } from "react";
import {
  createVaultItem,
  fetchVaultItems,
  initializeKryvexFirebase,
  softDeleteVaultItem,
  updateVaultItem,
} from "@kryvex/firebase";
import { secureLogger } from "@kryvex/security";
import type { ItemContent, ItemType, VaultItemDocument } from "@kryvex/types";
import { vaultItemDocumentSchema } from "@kryvex/validation";
import {
  decryptItemContent,
  encryptItemContent,
  initialItemCacheState,
  itemCacheReducer,
  reencryptItemContent,
  type DecryptedVaultItem,
} from "@kryvex/vault";
import {
  webFirebaseConfig,
  webFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";
import { useVault } from "@/providers/VaultProvider";

// See providers/VaultProvider.tsx's own getServices() comment: lazy,
// client-only, never called from render.
function getServices() {
  return initializeKryvexFirebase(webFirebaseConfig, webFirebaseEmulatorEnv);
}

function newItemId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface UseVaultItemsResult {
  items: DecryptedVaultItem[];
  loading: boolean;
  createItem: (type: ItemType, content: ItemContent) => Promise<string>;
  updateItem: (id: string, content: ItemContent) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  softDeleteItem: (id: string) => Promise<void>;
}

/**
 * Glue hook: apps/web-only, wires @kryvex/firebase's Firestore item CRUD to
 * @kryvex/vault's pure itemCrypto/itemCacheReducer, the same layering
 * VaultProvider.tsx already establishes for auth. Not a second Context —
 * a plain hook consumed per-page.
 *
 * Optimistic local ITEM_UPSERTED dispatch after every write is valid here
 * specifically because Phase 4 is single-writer/no-offline (Phase 5 adds
 * the conflict handling a second writer would need).
 */
export function useVaultItems(): UseVaultItemsResult {
  const { state } = useVault();
  const [cache, dispatch] = useReducer(itemCacheReducer, initialItemCacheState);
  // useTransition's isPending (not a plain useState "loading" flag set
  // synchronously at the top of the effect): react-hooks' set-state-in-effect
  // rule flags a bare setState call sitting directly in an effect body
  // (cascading-render risk) — an async transition is the sanctioned way to
  // surface a pending indicator for effect-driven async work like this fetch.
  const [loading, startTransition] = useTransition();

  const uid = state.status === "UNLOCKED" ? state.user.uid : undefined;
  const vaultEncryptionKey =
    state.status === "UNLOCKED" ? state.vaultEncryptionKey : undefined;

  useEffect(() => {
    if (!uid || !vaultEncryptionKey) {
      // Covers both "never unlocked yet" and "left UNLOCKED" — decrypted
      // plaintext must not outlive the unlocked session in memory.
      dispatch({ type: "CACHE_CLEARED" });
      return;
    }

    let cancelled = false;

    startTransition(async () => {
      const rawDocs = await fetchVaultItems(getServices().firestore, uid);
      if (cancelled) return;
      const items = rawDocs
        .map((raw): DecryptedVaultItem | null => {
          const parsed = vaultItemDocumentSchema.safeParse(raw);
          if (!parsed.success) {
            secureLogger.error(
              "Vault item document failed envelope validation",
            );
            return null;
          }
          const doc = parsed.data as VaultItemDocument;
          try {
            const content = decryptItemContent(
              vaultEncryptionKey,
              doc.wrappedItemKey,
              doc.encryptedData,
            );
            return { ...doc, decryptFailed: false, content };
          } catch {
            secureLogger.error("Vault item failed to decrypt", {
              id: doc.id,
            });
            return { ...doc, decryptFailed: true };
          }
        })
        .filter((item): item is DecryptedVaultItem => item !== null);
      dispatch({ type: "ITEMS_LOADED", items });
    });

    return () => {
      cancelled = true;
    };
  }, [uid, vaultEncryptionKey]);

  function requireUnlocked(): {
    uid: string;
    vaultEncryptionKey: Uint8Array;
  } {
    if (state.status !== "UNLOCKED") {
      throw new Error("Vault is locked.");
    }
    return {
      uid: state.user.uid,
      vaultEncryptionKey: state.vaultEncryptionKey,
    };
  }

  // Explicit variable annotation (not just the function's return type) so
  // every method below is contextually typed against UseVaultItemsResult —
  // same pattern VaultProvider.tsx uses for its `value` object.
  const result: UseVaultItemsResult = {
    items: cache.items,
    loading,

    async createItem(type, content) {
      const { uid, vaultEncryptionKey } = requireUnlocked();
      const id = newItemId();
      const { wrappedItemKey, encryptedData } = encryptItemContent(
        vaultEncryptionKey,
        content,
      );
      const envelope = {
        id,
        ownerId: uid,
        type,
        revision: 0,
        deleted: false,
        favorite: false,
        wrappedItemKey,
        encryptedData,
        attachmentRefs: [] as string[],
      };
      await createVaultItem(getServices().firestore, uid, id, envelope);
      dispatch({
        type: "ITEM_UPSERTED",
        item: {
          ...envelope,
          createdAt: null,
          updatedAt: null,
          decryptFailed: false,
          content,
        },
      });
      return id;
    },

    async updateItem(id, content) {
      const { uid, vaultEncryptionKey } = requireUnlocked();
      const existing = cache.items.find((i) => i.id === id);
      if (!existing) throw new Error("Item not found.");
      const { encryptedData } = reencryptItemContent(
        vaultEncryptionKey,
        existing.wrappedItemKey,
        content,
      );
      const envelope = {
        id: existing.id,
        ownerId: existing.ownerId,
        type: content.type,
        revision: existing.revision + 1,
        createdAt: existing.createdAt,
        deleted: existing.deleted,
        favorite: existing.favorite,
        wrappedItemKey: existing.wrappedItemKey,
        encryptedData,
        attachmentRefs: existing.attachmentRefs,
      };
      await updateVaultItem(getServices().firestore, uid, id, envelope);
      dispatch({
        type: "ITEM_UPSERTED",
        item: {
          ...envelope,
          updatedAt: null,
          decryptFailed: false,
          content,
        },
      });
    },

    async toggleFavorite(id) {
      const { uid } = requireUnlocked();
      const existing = cache.items.find((i) => i.id === id);
      if (!existing) throw new Error("Item not found.");
      const favorite = !existing.favorite;
      const envelope = {
        id: existing.id,
        ownerId: existing.ownerId,
        type: existing.type,
        revision: existing.revision + 1,
        createdAt: existing.createdAt,
        deleted: existing.deleted,
        favorite,
        wrappedItemKey: existing.wrappedItemKey,
        encryptedData: existing.encryptedData,
        attachmentRefs: existing.attachmentRefs,
      };
      await updateVaultItem(getServices().firestore, uid, id, envelope);
      dispatch({
        type: "ITEM_UPSERTED",
        item: { ...existing, ...envelope, updatedAt: null },
      });
    },

    async softDeleteItem(id) {
      const { uid } = requireUnlocked();
      const existing = cache.items.find((i) => i.id === id);
      if (!existing) throw new Error("Item not found.");
      const envelope = {
        id: existing.id,
        ownerId: existing.ownerId,
        type: existing.type,
        revision: existing.revision + 1,
        createdAt: existing.createdAt,
        deleted: true,
        favorite: existing.favorite,
        wrappedItemKey: existing.wrappedItemKey,
        encryptedData: existing.encryptedData,
        attachmentRefs: existing.attachmentRefs,
      };
      await softDeleteVaultItem(getServices().firestore, uid, id, envelope);
      dispatch({
        type: "ITEM_UPSERTED",
        item: { ...existing, ...envelope, updatedAt: null },
      });
    },
  };

  return result;
}
