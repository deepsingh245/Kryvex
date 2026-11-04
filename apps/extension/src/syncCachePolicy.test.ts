import type { SyncState } from "@kryvex/sync";
import type { VaultItemDocument } from "@kryvex/types";
import { describe, expect, it } from "vitest";
import { shouldPersistRemoteDoc } from "./syncCachePolicy";

const doc = {
  id: "item-1",
  ownerId: "user-1",
  type: "login",
  revision: 2,
  createdAt: null,
  updatedAt: null,
  deleted: false,
  favorite: false,
  wrappedItemKey: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
  encryptedData: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
  attachmentRefs: [],
} satisfies VaultItemDocument;

function withPending(baseRevision: number): SyncState {
  return {
    status: { [doc.id]: "pending" },
    conflicts: {},
    pendingWrites: {
      [doc.id]: {
        baseRevision,
        localDoc: { ...doc, revision: baseRevision + 1 },
        writeKind: "update",
      },
    },
  };
}

describe("shouldPersistRemoteDoc", () => {
  it("keeps a local pending envelope when an initial snapshot is stale", () => {
    expect(shouldPersistRemoteDoc(withPending(2), doc)).toBe(false);
  });

  it("accepts a newer remote side that creates a conflict", () => {
    expect(
      shouldPersistRemoteDoc(withPending(1), { ...doc, revision: 2 }),
    ).toBe(true);
  });

  it("accepts remote data when there is no pending write", () => {
    expect(
      shouldPersistRemoteDoc(
        { status: {}, pendingWrites: {}, conflicts: {} },
        doc,
      ),
    ).toBe(true);
  });
});
