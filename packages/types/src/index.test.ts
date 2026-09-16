import { describe, expect, it } from "vitest";
import {
  ITEM_TYPES,
  PHASE_1_MARKER,
  type Brand,
  type VaultItemDocument,
} from "./index";

describe("@kryvex/types placeholder", () => {
  it("exposes a phase marker", () => {
    expect(PHASE_1_MARKER).toEqual({ phase: 1, label: "foundation-scaffold" });
  });

  it("Brand<T, B> compiles as a nominal type over a primitive", () => {
    type ItemId = Brand<string, "ItemId">;
    const id = "abc-123" as ItemId;
    expect(typeof id).toBe("string");
  });
});

describe("vault item types", () => {
  it("declares all 12 item types from docs/DATA_MODEL.md §1", () => {
    expect(ITEM_TYPES.length).toBe(12);
    expect(ITEM_TYPES).toContain("login");
    expect(ITEM_TYPES).toContain("custom");
  });

  it("VaultItemDocument matches the documented envelope shape (compile-time check)", () => {
    const sample: VaultItemDocument = {
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
    };
    expect(sample.type).toBe("login");
  });
});
