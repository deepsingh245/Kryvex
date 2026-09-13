/**
 * AsyncStorage-backed implementation of @kryvex/storage's
 * VaultItemLocalStore — see that package's doc comment for why this lives
 * here (app-local) rather than in the shared package; mirrors
 * apps/web/src/lib/localItemStore.ts's IndexedDB implementation. Stores raw
 * VaultItemDocument envelopes only (already ciphertext/low-sensitivity
 * plaintext per docs/DATA_MODEL.md) — never decrypted ItemContent, never
 * the Vault Encryption Key. One JSON blob per uid (not a key per item):
 * simpler than AsyncStorage's multiGet/multiRemove for the vault sizes this
 * targets, and AsyncStorage has no query/index primitive to page through
 * per-item keys the way IndexedDB's "uid" index does on web.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { VaultItemDocument } from "@kryvex/types";
import type { VaultItemLocalStore } from "@kryvex/storage";

function storageKey(uid: string): string {
  return `kryvex-vault-cache:${uid}`;
}

async function readAll(
  uid: string,
): Promise<Record<string, VaultItemDocument>> {
  const raw = await AsyncStorage.getItem(storageKey(uid));
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, VaultItemDocument>;
  } catch {
    // Corrupted cache entry — treat as empty rather than throwing; the
    // real-time listener will repopulate it.
    return {};
  }
}

async function writeAll(
  uid: string,
  items: Record<string, VaultItemDocument>,
): Promise<void> {
  await AsyncStorage.setItem(storageKey(uid), JSON.stringify(items));
}

export function createAsyncStorageItemStore(): VaultItemLocalStore {
  return {
    async getAll(uid) {
      return Object.values(await readAll(uid));
    },

    async putMany(uid, items) {
      const all = await readAll(uid);
      for (const item of items) all[item.id] = item;
      await writeAll(uid, all);
    },

    async remove(uid, itemId) {
      const all = await readAll(uid);
      delete all[itemId];
      await writeAll(uid, all);
    },

    async clear(uid) {
      await AsyncStorage.removeItem(storageKey(uid));
    },
  };
}
