import { openDB, type IDBPDatabase } from "idb";
import type { SyncState } from "@kryvex/sync";
import type { VaultItemDocument } from "@kryvex/types";
import { assertEncryptedPersistenceValue } from "./persistenceGuard";

const DB_NAME = "kryvex-extension-cache";
const DB_VERSION = 1;
const ITEM_STORE = "items";
const SYNC_STORE = "sync";

interface StoredItem {
  key: string;
  uid: string;
  doc: VaultItemDocument;
}

interface StoredSync {
  uid: string;
  state: SyncState;
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const items = db.createObjectStore(ITEM_STORE, { keyPath: "key" });
      items.createIndex("uid", "uid");
      db.createObjectStore(SYNC_STORE, { keyPath: "uid" });
    },
  });
}

function itemKey(uid: string, itemId: string): string {
  return `${uid}/${itemId}`;
}

export interface ExtensionLocalStore {
  getItems(uid: string): Promise<VaultItemDocument[]>;
  putItems(uid: string, docs: VaultItemDocument[]): Promise<void>;
  removeItem(uid: string, itemId: string): Promise<void>;
  getSyncState(uid: string): Promise<SyncState | undefined>;
  putSyncState(uid: string, state: SyncState): Promise<void>;
  clear(uid: string): Promise<void>;
}

export function createExtensionLocalStore(): ExtensionLocalStore {
  return {
    async getItems(uid) {
      const db = await getDb();
      const records = (await db.getAllFromIndex(
        ITEM_STORE,
        "uid",
        uid,
      )) as StoredItem[];
      return records.map((record) => record.doc);
    },

    async putItems(uid, docs) {
      if (docs.length === 0) return;
      assertEncryptedPersistenceValue(docs);
      const db = await getDb();
      const tx = db.transaction(ITEM_STORE, "readwrite");
      await Promise.all([
        ...docs.map((doc) =>
          tx.store.put({
            key: itemKey(uid, doc.id),
            uid,
            doc,
          } satisfies StoredItem),
        ),
        tx.done,
      ]);
    },

    async removeItem(uid, itemId) {
      const db = await getDb();
      await db.delete(ITEM_STORE, itemKey(uid, itemId));
    },

    async getSyncState(uid) {
      const db = await getDb();
      const record = (await db.get(SYNC_STORE, uid)) as StoredSync | undefined;
      return record?.state;
    },

    async putSyncState(uid, state) {
      assertEncryptedPersistenceValue(state);
      const db = await getDb();
      await db.put(SYNC_STORE, { uid, state } satisfies StoredSync);
    },

    async clear(uid) {
      const db = await getDb();
      const tx = db.transaction([ITEM_STORE, SYNC_STORE], "readwrite");
      const keys = await tx
        .objectStore(ITEM_STORE)
        .index("uid")
        .getAllKeys(uid);
      await Promise.all([
        ...keys.map((key) => tx.objectStore(ITEM_STORE).delete(key)),
        tx.objectStore(SYNC_STORE).delete(uid),
        tx.done,
      ]);
    },
  };
}
