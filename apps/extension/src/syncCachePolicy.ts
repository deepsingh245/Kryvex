import type { SyncState } from "@kryvex/sync";
import type { VaultItemDocument } from "@kryvex/types";

/**
 * A stale remote snapshot must never replace the ciphertext for an unsynced
 * local edit. Newer remote data is retained because the sync state also keeps
 * the local envelope as the other side of the resulting conflict.
 */
export function shouldPersistRemoteDoc(
  state: SyncState,
  incoming: VaultItemDocument,
): boolean {
  const pending = state.pendingWrites[incoming.id];
  return !pending || incoming.revision > pending.baseRevision;
}
