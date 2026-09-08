/**
 * Phase 1 scaffold. The real local-cache abstraction (IndexedDB on web,
 * platform secure storage on mobile — see docs/CRYPTOGRAPHIC_ARCHITECTURE.md
 * §7 and build spec §58-59: encrypted-at-rest ciphertext only, never raw key
 * material) lands as offline-first sync is built in Phase 5. This
 * in-memory implementation is a TEMPORARY placeholder only — it must not be
 * used to cache real vault data, since it is neither persistent nor
 * platform-appropriate secure storage.
 */

export interface LocalCache {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
  delete(key: string): void;
  clear(): void;
}

/** TEMPORARY in-memory placeholder — replaced by a real platform-backed cache in Phase 5. */
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
