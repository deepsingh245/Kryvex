import type { VaultItemDocument } from "@kryvex/types";
import { describe, expect, it } from "vitest";
import {
  applyRemoteDoc,
  beginLocalWrite,
  confirmLocalWrite,
  dismissConflict,
  initialSyncState,
  rejectLocalWrite,
} from "./syncState";

function envelope(overrides: Partial<VaultItemDocument> = {}): VaultItemDocument {
  return {
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
    ...overrides,
  };
}

describe("beginLocalWrite / confirmLocalWrite", () => {
  it("marks an item pending, then synced on confirm", () => {
    const local = envelope({ revision: 1 });
    let state = beginLocalWrite(initialSyncState, "item1", 0, local);
    expect(state.status.item1).toBe("pending");

    state = confirmLocalWrite(state, "item1");
    expect(state.status.item1).toBe("synced");
    expect(state.pendingWrites.item1).toBeUndefined();
  });
});

describe("rejectLocalWrite", () => {
  it("records a conflict when a pending write is rejected", () => {
    const local = envelope({ revision: 1 });
    const server = envelope({ revision: 2 });
    let state = beginLocalWrite(initialSyncState, "item1", 0, local);
    state = rejectLocalWrite(state, "item1", server);

    expect(state.status.item1).toBe("conflict");
    expect(state.pendingWrites.item1).toBeUndefined();
    expect(state.conflicts.item1).toEqual({
      itemId: "item1",
      localDoc: local,
      serverDoc: server,
    });
  });

  it("is a no-op when there is no pending write for the item", () => {
    const server = envelope({ revision: 2 });
    const state = rejectLocalWrite(initialSyncState, "item1", server);
    expect(state).toEqual(initialSyncState);
  });
});

describe("applyRemoteDoc", () => {
  it("accepts as synced when there is no pending write", () => {
    const state = applyRemoteDoc(initialSyncState, envelope({ revision: 3 }));
    expect(state.status.item1).toBe("synced");
    expect(state.conflicts.item1).toBeUndefined();
  });

  it("is a no-op when the incoming doc is stale relative to a pending write's base", () => {
    const local = envelope({ revision: 1 });
    let state = beginLocalWrite(initialSyncState, "item1", 0, local);
    state = applyRemoteDoc(state, envelope({ revision: 0 }));
    expect(state.status.item1).toBe("pending");
    expect(state.conflicts.item1).toBeUndefined();
  });

  it("detects a proactive conflict when another write already landed past our pending write's base", () => {
    const local = envelope({ revision: 1 });
    let state = beginLocalWrite(initialSyncState, "item1", 0, local);
    const server = envelope({ revision: 1 }); // someone else's write also based on revision 0
    state = applyRemoteDoc(state, server);

    expect(state.status.item1).toBe("conflict");
    expect(state.pendingWrites.item1).toBeUndefined();
    expect(state.conflicts.item1).toEqual({
      itemId: "item1",
      localDoc: local,
      serverDoc: server,
    });
  });

  it("does not affect unrelated items' pending writes", () => {
    const local = envelope({ id: "item1", revision: 1 });
    let state = beginLocalWrite(initialSyncState, "item1", 0, local);
    state = applyRemoteDoc(state, envelope({ id: "item2", revision: 5 }));
    expect(state.status.item2).toBe("synced");
    expect(state.status.item1).toBe("pending");
  });
});

describe("dismissConflict", () => {
  it("clears a conflict and marks the item synced", () => {
    const local = envelope({ revision: 1 });
    const server = envelope({ revision: 2 });
    let state = beginLocalWrite(initialSyncState, "item1", 0, local);
    state = rejectLocalWrite(state, "item1", server);
    state = dismissConflict(state, "item1");

    expect(state.status.item1).toBe("synced");
    expect(state.conflicts.item1).toBeUndefined();
  });
});
