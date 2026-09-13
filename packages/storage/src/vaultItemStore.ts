/**
 * Platform-agnostic interface for the offline vault-item cache — see
 * docs/SYNC_ENGINE.md and docs/CRYPTOGRAPHIC_ARCHITECTURE.md §7 ("encrypted
 * at rest, never raw key material"). `VaultItemDocument` is already all
 * ciphertext/low-sensitivity-plaintext-metadata per docs/DATA_MODEL.md's
 * field table — nothing new becomes plaintext by being cached here.
 *
 * Only the interface lives in this package. Concrete implementations
 * (IndexedDB on web, AsyncStorage on mobile) live in each consuming app —
 * same precedent Phase 4b set for packages/ui's DOM-only components: it
 * avoids needing a second, platform-specific test runner inside this
 * package's existing Vitest-only setup, and each platform only has one
 * implementation to give today.
 */

import type { VaultItemDocument } from "@kryvex/types";

export interface VaultItemLocalStore {
  getAll(uid: string): Promise<VaultItemDocument[]>;
  putMany(uid: string, items: VaultItemDocument[]): Promise<void>;
  // Local eviction only — never a server hard-delete (firestore.rules
  // disallows those; tombstones are the only server-side delete path).
  remove(uid: string, itemId: string): Promise<void>;
  clear(uid: string): Promise<void>;
}
