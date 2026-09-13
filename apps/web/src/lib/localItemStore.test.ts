import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import type { VaultItemDocument } from "@kryvex/types";
import { createIndexedDbItemStore } from "./localItemStore";

function envelope(
  uid: string,
  itemId: string,
  overrides: Partial<VaultItemDocument> = {},
): VaultItemDocument {
  return {
    id: itemId,
    ownerId: uid,
    type: "login",
    revision: 0,
    updatedAt: null,
    createdAt: null,
    deleted: false,
    favorite: false,
    wrappedItemKey: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
    encryptedData: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
    attachmentRefs: [],
    ...overrides,
  };
}

// Each test uses its own uid so cases don't interfere with each other in
// the shared fake-indexeddb instance for this test file.
function uniqueUid(): string {
  return `uid-${Math.random().toString(36).slice(2)}`;
}

describe("createIndexedDbItemStore", () => {
  it("returns an empty array for a uid with nothing cached", async () => {
    const store = createIndexedDbItemStore();
    expect(await store.getAll(uniqueUid())).toEqual([]);
  });

  it("round-trips putMany/getAll", async () => {
    const store = createIndexedDbItemStore();
    const uid = uniqueUid();
    const a = envelope(uid, "item1");
    const b = envelope(uid, "item2");
    await store.putMany(uid, [a, b]);

    const all = await store.getAll(uid);
    expect(all).toHaveLength(2);
    expect(all.map((d) => d.id).sort()).toEqual(["item1", "item2"]);
  });

  it("putMany overwrites an existing document with the same id", async () => {
    const store = createIndexedDbItemStore();
    const uid = uniqueUid();
    await store.putMany(uid, [envelope(uid, "item1", { revision: 0 })]);
    await store.putMany(uid, [envelope(uid, "item1", { revision: 1 })]);

    const all = await store.getAll(uid);
    expect(all).toHaveLength(1);
    expect(all[0]!.revision).toBe(1);
  });

  it("only returns documents scoped to the given uid", async () => {
    const store = createIndexedDbItemStore();
    const uidA = uniqueUid();
    const uidB = uniqueUid();
    await store.putMany(uidA, [envelope(uidA, "item1")]);
    await store.putMany(uidB, [envelope(uidB, "item1")]);

    expect(await store.getAll(uidA)).toHaveLength(1);
    expect(await store.getAll(uidB)).toHaveLength(1);
  });

  it("remove evicts a single item", async () => {
    const store = createIndexedDbItemStore();
    const uid = uniqueUid();
    await store.putMany(uid, [envelope(uid, "item1"), envelope(uid, "item2")]);
    await store.remove(uid, "item1");

    const all = await store.getAll(uid);
    expect(all.map((d) => d.id)).toEqual(["item2"]);
  });

  it("clear evicts every item for a uid, leaving other uids untouched", async () => {
    const store = createIndexedDbItemStore();
    const uidA = uniqueUid();
    const uidB = uniqueUid();
    await store.putMany(uidA, [
      envelope(uidA, "item1"),
      envelope(uidA, "item2"),
    ]);
    await store.putMany(uidB, [envelope(uidB, "item1")]);

    await store.clear(uidA);

    expect(await store.getAll(uidA)).toEqual([]);
    expect(await store.getAll(uidB)).toHaveLength(1);
  });
});
