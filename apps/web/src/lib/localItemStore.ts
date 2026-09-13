/**
 * IndexedDB-backed implementation of @kryvex/storage's VaultItemLocalStore —
 * see that package's doc comment for why this lives here (app-local) rather
 * than in the shared package. Stores raw VaultItemDocument envelopes only
 * (already ciphertext/low-sensitivity-plaintext per docs/DATA_MODEL.md) —
 * never decrypted ItemContent, never the Vault Encryption Key.
 */

import { openDB, type IDBPDatabase } from "idb";
import type { VaultItemDocument } from "@kryvex/types";
import type { VaultItemLocalStore } from "@kryvex/storage";

const DB_NAME = "kryvex-vault-cache";
const DB_VERSION = 1;
const STORE_NAME = "items";

interface StoredRecord {
  key: string; // `${uid}/${itemId}`
  uid: string;
  doc: VaultItemDocument;
}

function recordKey(uid: string, itemId: string): string {
  return `${uid}/${itemId}`;
}

async function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
      store.createIndex("uid", "uid");
    },
  });
}

export function createIndexedDbItemStore(): VaultItemLocalStore {
  return {
    async getAll(uid) {
      const db = await getDb();
      const records = (await db.getAllFromIndex(
        STORE_NAME,
        "uid",
        uid,
      )) as StoredRecord[];
      return records.map((r) => r.doc);
    },

    async putMany(uid, items) {
      const db = await getDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      await Promise.all([
        ...items.map((doc) =>
          tx.store.put({ key: recordKey(uid, doc.id), uid, doc }),
        ),
        tx.done,
      ]);
    },

    async remove(uid, itemId) {
      const db = await getDb();
      await db.delete(STORE_NAME, recordKey(uid, itemId));
    },

    async clear(uid) {
      const db = await getDb();
      const tx = db.transaction(STORE_NAME, "readwrite");
      const keys = await tx.store.index("uid").getAllKeys(uid);
      await Promise.all([...keys.map((key) => tx.store.delete(key)), tx.done]);
    },
  };
}
