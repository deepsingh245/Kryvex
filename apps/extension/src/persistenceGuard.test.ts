import { describe, expect, it } from "vitest";
import { assertEncryptedPersistenceValue } from "./persistenceGuard";

describe("assertEncryptedPersistenceValue", () => {
  it("accepts ciphertext envelopes and routing metadata", () => {
    expect(() =>
      assertEncryptedPersistenceValue({
        uid: "user-1",
        doc: {
          id: "item-1",
          encryptedData: { ciphertext: "opaque", iv: "iv" },
          wrappedItemKey: { ciphertext: "wrapped", iv: "iv" },
        },
      }),
    ).not.toThrow();
  });

  it("rejects nested plaintext credential and key fields", () => {
    expect(() =>
      assertEncryptedPersistenceValue({ pending: [{ username: "person" }] }),
    ).toThrow(/plaintext credential field/);
    expect(() =>
      assertEncryptedPersistenceValue({ vaultEncryptionKey: [1, 2, 3] }),
    ).toThrow(/plaintext credential field/);
  });
});
