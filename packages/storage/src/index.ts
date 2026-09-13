/**
 * `LocalCache` below is a generic string k/v scaffold kept for whatever
 * still wants a trivial in-memory cache. The real offline vault-item cache
 * — `VaultItemLocalStore` — lands with Phase 5's sync engine; see
 * vaultItemStore.ts for the platform-agnostic interface (concrete
 * IndexedDB/AsyncStorage implementations live in each consuming app).
 */

export interface LocalCache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  clear(): void;
}

/** Generic in-memory k/v cache — not the vault-item offline cache (see VaultItemLocalStore). */
export function createInMemoryLocalCache(): LocalCache {
  const store = new Map<string, string>();
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value);
    },
    delete: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

export type { VaultItemLocalStore } from "./vaultItemStore";
