"use client";

import { useEffect, useMemo, useReducer, useTransition } from "react";
import {
  createVaultItem,
  fetchAttachmentDocument,
  fetchVaultItem,
  initializeKryvexFirebase,
  softDeleteAttachmentDocument,
  subscribeToVaultItems,
  updateVaultItem,
} from "@kryvex/firebase";
import { secureLogger } from "@kryvex/security";
import {
  applyRemoteDoc,
  beginLocalWrite,
  confirmLocalWrite,
  dismissConflict,
  initialSyncState,
  rejectLocalWrite,
  type PendingWrite,
  type SyncState,
} from "@kryvex/sync";
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
import { createIndexedDbItemStore } from "@/lib/localItemStore";
import { useVault } from "@/providers/VaultProvider";
import { useOnlineStatus } from "./useOnlineStatus";

// See providers/VaultProvider.tsx's own getServices() comment: lazy,
// client-only, never called from render.
function getServices() {
  return initializeKryvexFirebase(webFirebaseConfig, webFirebaseEmulatorEnv);
}

// Exported so callers that need the id before the item is created (e.g. an
// attachment item's AttachmentDocument.itemId, which must exist before the
// item write that references it back) can generate it up front rather than
// waiting for createItem's return value.
export function newItemId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Firestore rejects a stale-revision write via the security rules, which
// surfaces as a "permission-denied" FirebaseError — see
// firebase/firestore.rules' compare-and-swap check. There's no separate
// error code for "CAS rejected" vs. "some other rule violation," so any
// permission-denied is treated as a possible conflict (see
// docs/SYNC_ENGINE.md §7); anything else (network failure, offline) leaves
// the write "pending" for the reconnect-retry effect below.
function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "permission-denied"
  );
}

type SyncAction =
  | {
      type: "BEGIN_WRITE";
      itemId: string;
      baseRevision: number;
      localDoc: VaultItemDocument;
      writeKind: "create" | "update";
    }
  | { type: "CONFIRM_WRITE"; itemId: string }
  | { type: "REJECT_WRITE"; itemId: string; serverDoc: VaultItemDocument }
  | { type: "APPLY_REMOTE"; doc: VaultItemDocument }
  | { type: "DISMISS_CONFLICT"; itemId: string };

function syncReducer(state: SyncState, action: SyncAction): SyncState {
  switch (action.type) {
    case "BEGIN_WRITE":
      return beginLocalWrite(
        state,
        action.itemId,
        action.baseRevision,
        action.localDoc,
        action.writeKind,
      );
    case "CONFIRM_WRITE":
      return confirmLocalWrite(state, action.itemId);
    case "REJECT_WRITE":
      return rejectLocalWrite(state, action.itemId, action.serverDoc);
    case "APPLY_REMOTE":
      return applyRemoteDoc(state, action.doc);
    case "DISMISS_CONFLICT":
      return dismissConflict(state, action.itemId);
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export type ConflictResolution = "keepMine" | "keepServer" | "keepBoth";

export interface DecryptedSyncConflict {
  itemId: string;
  // undefined only if that side's envelope somehow fails to decrypt
  // (corrupted document) — the resolution screen shows a fallback for it.
  localContent: ItemContent | undefined;
  serverContent: ItemContent | undefined;
}

export interface UseVaultItemsResult {
  items: DecryptedVaultItem[];
  loading: boolean;
  isOnline: boolean;
  conflicts: DecryptedSyncConflict[];
  createItem: (
    type: ItemType,
    content: ItemContent,
    attachmentRefs?: string[],
    id?: string,
  ) => Promise<string>;
  updateItem: (id: string, content: ItemContent) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  softDeleteItem: (id: string) => Promise<void>;
  resolveConflict: (
    itemId: string,
    resolution: ConflictResolution,
  ) => Promise<void>;
}

/**
 * Glue hook: apps/web-only, wires @kryvex/firebase's Firestore item CRUD +
 * real-time listener to @kryvex/vault's pure itemCrypto/itemCacheReducer and
 * @kryvex/sync's pure conflict bookkeeping. Offline-first: hydrates from the
 * local IndexedDB cache immediately, then reconciles against the live
 * listener — see docs/SYNC_ENGINE.md.
 */
export function useVaultItems(): UseVaultItemsResult {
  const { state } = useVault();
  const [cache, dispatchCache] = useReducer(
    itemCacheReducer,
    initialItemCacheState,
  );
  const [sync, dispatchSync] = useReducer(syncReducer, initialSyncState);
  // Same react-hooks/set-state-in-effect rationale as Phase 4's hook: an
  // async transition, not a raw setState call synchronously in the effect
  // body.
  const [loading, startTransition] = useTransition();
  const isOnline = useOnlineStatus();
  const localStore = useMemo(() => createIndexedDbItemStore(), []);

  const uid = state.status === "UNLOCKED" ? state.user.uid : undefined;
  const vaultEncryptionKey =
    state.status === "UNLOCKED" ? state.vaultEncryptionKey : undefined;

  function decryptDoc(
    doc: VaultItemDocument,
    vek: Uint8Array,
  ): DecryptedVaultItem {
    try {
      const content = decryptItemContent(
        vek,
        doc.wrappedItemKey,
        doc.encryptedData,
      );
      return { ...doc, decryptFailed: false, content };
    } catch {
      secureLogger.error("Vault item failed to decrypt", { id: doc.id });
      return { ...doc, decryptFailed: true };
    }
  }

  // Hydrate from the local cache immediately (works offline), then attach
  // the real-time listener to reconcile against the server.
  useEffect(() => {
    if (!uid || !vaultEncryptionKey) {
      // Covers both "never unlocked yet" and "left UNLOCKED" — decrypted
      // plaintext must not outlive the unlocked session in memory. The
      // encrypted local cache itself legitimately persists across
      // lock/unlock, so it is deliberately NOT cleared here.
      dispatchCache({ type: "CACHE_CLEARED" });
      return;
    }

    let cancelled = false;
    let unsubscribe = () => {};

    // Hydration must fully land (ITEMS_LOADED, a wholesale replace) before
    // the listener attaches — subscribing first races the two dispatches:
    // if a live update won the race and upserted an item, the hydration
    // dispatch resolving afterward would wipe it back out.
    startTransition(async () => {
      const cachedDocs = await localStore.getAll(uid);
      if (cancelled) return;
      dispatchCache({
        type: "ITEMS_LOADED",
        items: cachedDocs.map((doc) => decryptDoc(doc, vaultEncryptionKey)),
      });

      unsubscribe = subscribeToVaultItems(
        getServices().firestore,
        uid,
        (rawDocs) => {
          if (cancelled) return;
          const validDocs: VaultItemDocument[] = [];
          for (const raw of rawDocs) {
            const parsed = vaultItemDocumentSchema.safeParse(raw);
            if (!parsed.success) {
              secureLogger.error(
                "Vault item document failed envelope validation",
              );
              continue;
            }
            validDocs.push(parsed.data as VaultItemDocument);
          }
          for (const doc of validDocs) {
            dispatchSync({ type: "APPLY_REMOTE", doc });
            dispatchCache({
              type: "ITEM_UPSERTED",
              item: decryptDoc(doc, vaultEncryptionKey),
            });
          }
          void localStore.putMany(uid, validDocs);
        },
        (error) => {
          secureLogger.error("Vault item listener failed", {
            message: String(error),
          });
        },
      );
      if (cancelled) unsubscribe();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- localStore is a stable useMemo, decryptDoc/getServices are pure helpers
  }, [uid, vaultEncryptionKey]);

  async function attemptWrite(
    itemId: string,
    localDoc: VaultItemDocument,
    writeKind: "create" | "update",
  ) {
    try {
      if (writeKind === "create") {
        await createVaultItem(
          getServices().firestore,
          localDoc.ownerId,
          itemId,
          localDoc as unknown as Record<string, unknown>,
        );
      } else {
        await updateVaultItem(
          getServices().firestore,
          localDoc.ownerId,
          itemId,
          localDoc as unknown as Record<string, unknown>,
        );
      }
      dispatchSync({ type: "CONFIRM_WRITE", itemId });
    } catch (err) {
      if (isPermissionDenied(err)) {
        const serverRaw = await fetchVaultItem(
          getServices().firestore,
          localDoc.ownerId,
          itemId,
        );
        const parsed = serverRaw
          ? vaultItemDocumentSchema.safeParse(serverRaw)
          : undefined;
        if (parsed?.success) {
          dispatchSync({
            type: "REJECT_WRITE",
            itemId,
            serverDoc: parsed.data as VaultItemDocument,
          });
          return;
        }
      }
      // Offline / unknown error, or the CAS-rejected doc vanished server-
      // side: leave "pending" — retried by the reconnect effect below.
      secureLogger.error("Vault item write failed, will retry", {
        id: itemId,
      });
    }
  }

  // Retry every outstanding pending write once connectivity returns.
  useEffect(() => {
    if (!isOnline || !uid) return;
    const entries = Object.entries(sync.pendingWrites) as [
      string,
      PendingWrite,
    ][];
    for (const [itemId, pending] of entries) {
      void attemptWrite(itemId, pending.localDoc, pending.writeKind);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-running on every sync.pendingWrites change would re-fire in-flight retries
  }, [isOnline, uid]);

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

  async function writeAndTrack(
    uid: string,
    envelope: VaultItemDocument,
    writeKind: "create" | "update",
  ) {
    const baseRevision = envelope.revision - 1;
    dispatchSync({
      type: "BEGIN_WRITE",
      itemId: envelope.id,
      baseRevision,
      localDoc: envelope,
      writeKind,
    });
    await localStore.putMany(uid, [envelope]);
    await attemptWrite(envelope.id, envelope, writeKind);
  }

  const conflicts: DecryptedSyncConflict[] = vaultEncryptionKey
    ? Object.values(sync.conflicts).map((conflict) => {
        let localContent: ItemContent | undefined;
        let serverContent: ItemContent | undefined;
        try {
          localContent = decryptItemContent(
            vaultEncryptionKey,
            conflict.localDoc.wrappedItemKey,
            conflict.localDoc.encryptedData,
          );
        } catch {
          secureLogger.error("Conflict's local item failed to decrypt", {
            id: conflict.itemId,
          });
        }
        try {
          serverContent = decryptItemContent(
            vaultEncryptionKey,
            conflict.serverDoc.wrappedItemKey,
            conflict.serverDoc.encryptedData,
          );
        } catch {
          secureLogger.error("Conflict's server item failed to decrypt", {
            id: conflict.itemId,
          });
        }
        return { itemId: conflict.itemId, localContent, serverContent };
      })
    : [];

  // Explicit variable annotation (not just the function's return type) so
  // every method below is contextually typed against UseVaultItemsResult —
  // same pattern VaultProvider.tsx uses for its `value` object.
  const result: UseVaultItemsResult = {
    items: cache.items,
    loading,
    isOnline,
    conflicts,

    async createItem(type, content, attachmentRefs = [], id = newItemId()) {
      const { uid, vaultEncryptionKey } = requireUnlocked();
      const { wrappedItemKey, encryptedData } = encryptItemContent(
        vaultEncryptionKey,
        content,
      );
      const envelope: VaultItemDocument = {
        id,
        ownerId: uid,
        type,
        revision: 0,
        createdAt: null,
        updatedAt: null,
        deleted: false,
        favorite: false,
        wrappedItemKey,
        encryptedData,
        attachmentRefs,
      };
      dispatchCache({
        type: "ITEM_UPSERTED",
        item: { ...envelope, decryptFailed: false, content },
      });
      await writeAndTrack(uid, envelope, "create");
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
      const envelope: VaultItemDocument = {
        id: existing.id,
        ownerId: existing.ownerId,
        type: content.type,
        revision: existing.revision + 1,
        createdAt: existing.createdAt,
        updatedAt: null,
        deleted: existing.deleted,
        favorite: existing.favorite,
        wrappedItemKey: existing.wrappedItemKey,
        encryptedData,
        attachmentRefs: existing.attachmentRefs,
      };
      dispatchCache({
        type: "ITEM_UPSERTED",
        item: { ...envelope, decryptFailed: false, content },
      });
      await writeAndTrack(uid, envelope, "update");
    },

    async toggleFavorite(id) {
      const { uid } = requireUnlocked();
      const existing = cache.items.find((i) => i.id === id);
      if (!existing) throw new Error("Item not found.");
      const envelope: VaultItemDocument = {
        id: existing.id,
        ownerId: existing.ownerId,
        type: existing.type,
        revision: existing.revision + 1,
        createdAt: existing.createdAt,
        updatedAt: null,
        deleted: existing.deleted,
        favorite: !existing.favorite,
        wrappedItemKey: existing.wrappedItemKey,
        encryptedData: existing.encryptedData,
        attachmentRefs: existing.attachmentRefs,
      };
      dispatchCache({
        type: "ITEM_UPSERTED",
        item: { ...existing, ...envelope },
      });
      await writeAndTrack(uid, envelope, "update");
    },

    async softDeleteItem(id) {
      const { uid } = requireUnlocked();
      const existing = cache.items.find((i) => i.id === id);
      if (!existing) throw new Error("Item not found.");
      const envelope: VaultItemDocument = {
        id: existing.id,
        ownerId: existing.ownerId,
        type: existing.type,
        revision: existing.revision + 1,
        createdAt: existing.createdAt,
        updatedAt: null,
        deleted: true,
        favorite: existing.favorite,
        wrappedItemKey: existing.wrappedItemKey,
        encryptedData: existing.encryptedData,
        attachmentRefs: existing.attachmentRefs,
      };
      dispatchCache({
        type: "ITEM_UPSERTED",
        item: { ...existing, ...envelope },
      });
      await writeAndTrack(uid, envelope, "update");

      // Best-effort cascade: an attachment-doc tombstone failure must never
      // block or roll back the item's own tombstone above — the attachment
      // GC function only ever acts on tombstoned docs, so a failure here
      // just means this attachment's Storage blob is cleaned up on a later
      // retry rather than never.
      for (const attachmentId of existing.attachmentRefs) {
        try {
          const attachmentDoc = await fetchAttachmentDocument(
            getServices().firestore,
            uid,
            attachmentId,
          );
          if (attachmentDoc) {
            await softDeleteAttachmentDocument(
              getServices().firestore,
              uid,
              attachmentId,
              attachmentDoc,
            );
          }
        } catch {
          secureLogger.error("Failed to tombstone attachment", {
            id: attachmentId,
          });
        }
      }
    },

    async resolveConflict(itemId, resolution) {
      const { uid, vaultEncryptionKey } = requireUnlocked();
      const conflict = sync.conflicts[itemId];
      if (!conflict) return;

      if (resolution === "keepServer") {
        dispatchCache({
          type: "ITEM_UPSERTED",
          item: decryptDoc(conflict.serverDoc, vaultEncryptionKey),
        });
        dispatchSync({ type: "DISMISS_CONFLICT", itemId });
        return;
      }

      const localContent = decryptItemContent(
        vaultEncryptionKey,
        conflict.localDoc.wrappedItemKey,
        conflict.localDoc.encryptedData,
      );

      if (resolution === "keepMine") {
        // Re-encrypts under the item's existing DEK (unwrapped from the
        // server's current wrappedItemKey) — same DEK-reuse-on-edit pattern
        // Phase 4 already established, building on the server's current
        // revision so the compare-and-swap succeeds.
        const { encryptedData } = reencryptItemContent(
          vaultEncryptionKey,
          conflict.serverDoc.wrappedItemKey,
          localContent,
        );
        const envelope: VaultItemDocument = {
          ...conflict.serverDoc,
          encryptedData,
          revision: conflict.serverDoc.revision + 1,
        };
        dispatchCache({
          type: "ITEM_UPSERTED",
          item: { ...envelope, decryptFailed: false, content: localContent },
        });
        await writeAndTrack(uid, envelope, "update");
        dispatchSync({ type: "DISMISS_CONFLICT", itemId });
        return;
      }

      // keepBoth: the server's item is already correctly reflected (kept
      // as-is); the local content becomes a brand-new item via the normal
      // create path, so it gets its own fresh DEK rather than reusing the
      // conflicting item's.
      const newId = newItemId();
      const { wrappedItemKey, encryptedData } = encryptItemContent(
        vaultEncryptionKey,
        localContent,
      );
      const newEnvelope: VaultItemDocument = {
        id: newId,
        ownerId: uid,
        type: localContent.type,
        revision: 0,
        createdAt: null,
        updatedAt: null,
        deleted: false,
        favorite: conflict.localDoc.favorite,
        wrappedItemKey,
        encryptedData,
        attachmentRefs: [],
      };
      dispatchCache({
        type: "ITEM_UPSERTED",
        item: { ...newEnvelope, decryptFailed: false, content: localContent },
      });
      await writeAndTrack(uid, newEnvelope, "create");
      dispatchSync({ type: "DISMISS_CONFLICT", itemId });
    },
  };

  return result;
}
