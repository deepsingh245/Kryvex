/**
 * Pure sync/conflict bookkeeping — see docs/SYNC_ENGINE.md §6-7. Zero
 * Firebase/React/crypto dependency (same principle @kryvex/vault's
 * lockStateReducer/itemCacheReducer already follow): this package tracks
 * *state* only (which items are synced/pending/conflicted, and the two
 * envelopes behind an unresolved conflict) — it never encrypts/decrypts,
 * never touches Firestore, and never builds a write payload itself. The
 * consuming app's hook owns all of that (it already has the Vault
 * Encryption Key and the Firestore wrapper functions), reusing
 * @kryvex/vault's existing itemCrypto primitives exactly as Phase 4 did for
 * plain edits (see apps/web/src/hooks/useVaultItems.ts).
 *
 * "keep both" deliberately isn't decided here either: the caller resolves it
 * by calling its own createItem-equivalent path, which is what already
 * gives a genuinely new item a fresh DEK (docs/CRYPTOGRAPHIC_ARCHITECTURE.md
 * key-per-item design) — this module has no opinion on encryption at all.
 */

import type { VaultItemDocument } from "@kryvex/types";

export type SyncItemStatus = "synced" | "pending" | "conflict";

export interface SyncConflict {
  itemId: string;
  // The envelope our own pending write was trying to persist.
  localDoc: VaultItemDocument;
  // What the server actually holds now.
  serverDoc: VaultItemDocument;
}

export interface PendingWrite {
  // The revision our optimistic write was built on top of (i.e. we're
  // trying to become baseRevision + 1).
  baseRevision: number;
  localDoc: VaultItemDocument;
  // Which Firestore call a retry (after regaining connectivity) should use
  // — "create" doesn't exist yet on the server, "update" (also covers
  // soft-delete, which is just an update with deleted:true) does.
  writeKind: "create" | "update";
}

export interface SyncState {
  status: Record<string, SyncItemStatus>;
  pendingWrites: Record<string, PendingWrite>;
  conflicts: Record<string, SyncConflict>;
}

export const initialSyncState: SyncState = {
  status: {},
  pendingWrites: {},
  conflicts: {},
};

function omit<T extends object>(
  record: Record<string, T>,
  key: string,
): Record<string, T> {
  const next = { ...record };
  delete next[key];
  return next;
}

/** Called right before attempting a local write (create/update/toggle/delete). */
export function beginLocalWrite(
  state: SyncState,
  itemId: string,
  baseRevision: number,
  localDoc: VaultItemDocument,
  writeKind: "create" | "update",
): SyncState {
  return {
    ...state,
    status: { ...state.status, [itemId]: "pending" },
    pendingWrites: {
      ...state.pendingWrites,
      [itemId]: { baseRevision, localDoc, writeKind },
    },
  };
}

/** Called once the Firestore write for `itemId` succeeds. */
export function confirmLocalWrite(state: SyncState, itemId: string): SyncState {
  return {
    ...state,
    status: { ...state.status, [itemId]: "synced" },
    pendingWrites: omit(state.pendingWrites, itemId),
  };
}

/**
 * Called when the Firestore write for `itemId` is rejected by the
 * compare-and-swap rule (stale revision) — see docs/SYNC_ENGINE.md §7's
 * retry-on-rejection path. `serverDoc` is the current server document,
 * re-fetched by the caller after the rejection.
 */
export function rejectLocalWrite(
  state: SyncState,
  itemId: string,
  serverDoc: VaultItemDocument,
): SyncState {
  const pending = state.pendingWrites[itemId];
  if (!pending) return state;
  return {
    ...state,
    status: { ...state.status, [itemId]: "conflict" },
    pendingWrites: omit(state.pendingWrites, itemId),
    conflicts: {
      ...state.conflicts,
      [itemId]: { itemId, localDoc: pending.localDoc, serverDoc },
    },
  };
}

/**
 * Called for every document delivered by the real-time listener
 * (docs/SYNC_ENGINE.md §6's per-envelope accept/no-op/conflict rules).
 * Detects the *proactive* conflict case: another client's write already
 * landed at or past the revision our own pending write is aiming for,
 * before our write even attempted its compare-and-swap.
 */
export function applyRemoteDoc(
  state: SyncState,
  incoming: VaultItemDocument,
): SyncState {
  const pending = state.pendingWrites[incoming.id];
  if (pending) {
    if (incoming.revision > pending.baseRevision) {
      return {
        ...state,
        status: { ...state.status, [incoming.id]: "conflict" },
        pendingWrites: omit(state.pendingWrites, incoming.id),
        conflicts: {
          ...state.conflicts,
          [incoming.id]: {
            itemId: incoming.id,
            localDoc: pending.localDoc,
            serverDoc: incoming,
          },
        },
      };
    }
    // incoming.revision <= pending.baseRevision: stale relative to our
    // pending write (which hasn't landed yet) — no-op.
    return state;
  }

  return { ...state, status: { ...state.status, [incoming.id]: "synced" } };
}

/** Called once the caller has finished writing a conflict's chosen resolution. */
export function dismissConflict(state: SyncState, itemId: string): SyncState {
  return {
    ...state,
    status: { ...state.status, [itemId]: "synced" },
    conflicts: omit(state.conflicts, itemId),
  };
}
