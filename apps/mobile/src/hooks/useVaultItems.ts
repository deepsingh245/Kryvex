import { useEffect, useReducer, useTransition } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
// See providers/VaultProvider.tsx's identical import for the rationale of
// importing getReactNativePersistence from the scoped "@firebase/auth"
// package rather than "firebase/auth".
import { getReactNativePersistence } from "@firebase/auth";
import {
  createVaultItem,
  fetchVaultItems,
  initializeKryvexFirebaseNative,
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
  mobileFirebaseConfig,
  mobileFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";
import { useVault } from "@/providers/VaultProvider";

// See providers/VaultProvider.tsx's own getServices() — mirrors it exactly.
function getServices() {
  return initializeKryvexFirebaseNative(
    mobileFirebaseConfig,
    mobileFirebaseEmulatorEnv,
    getReactNativePersistence(AsyncStorage),
  );
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
 * Glue hook: apps/mobile-only, near-twin of apps/web/src/hooks/useVaultItems.ts
 * (see that file's doc comment for the full rationale) — same
 * @kryvex/vault pure crypto/cache layers, same optimistic-write reasoning,
 * differing only in Firebase init (native persistence) and config import.
 */
export function useVaultItems(): UseVaultItemsResult {
  const { state } = useVault();
  const [cache, dispatch] = useReducer(itemCacheReducer, initialItemCacheState);
  // Same react-hooks/set-state-in-effect rationale as web's hook: an async
  // transition, not a raw setState call synchronously in the effect body.
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
