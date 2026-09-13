import { describe, expect, it } from "vitest";
import { applyRemoteDoc, initialSyncState } from "./index";

describe("@kryvex/sync public API", () => {
  it("applyRemoteDoc is reachable from the package entry point", () => {
    const state = applyRemoteDoc(initialSyncState, {
      id: "item1",
      ownerId: "alice",
      type: "login",
      revision: 0,
      updatedAt: null,
      createdAt: null,
      deleted: false,
      favorite: false,
      wrappedItemKey: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
      encryptedData: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
      attachmentRefs: [],
    });
    expect(state.status.item1).toBe("synced");
  });
});
