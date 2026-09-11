import { describe, expect, it } from "vitest";
import {
  customFieldSchema,
  itemContentSchema,
  vaultItemDocumentSchema,
} from "./vaultItem";

function baseFields() {
  return { title: "My item", tags: ["work"], customFields: [] };
}

describe("itemContentSchema — valid content per type", () => {
  it("accepts a valid login", () => {
    const result = itemContentSchema.safeParse({
      ...baseFields(),
      type: "login",
      username: "alice",
      password: "hunter2",
      websites: ["https://example.com"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid secure note", () => {
    const result = itemContentSchema.safeParse({
      ...baseFields(),
      type: "secureNote",
      body: "top secret",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid card", () => {
    const result = itemContentSchema.safeParse({
      ...baseFields(),
      type: "card",
      cardholderName: "Alice",
      number: "4111111111111111",
      expiry: "12/28",
      cvv: "123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid custom item with no fixed fields", () => {
    const result = itemContentSchema.safeParse({
      ...baseFields(),
      type: "custom",
    });
    expect(result.success).toBe(true);
  });

  it("accepts image/pdf/file as distinct discriminant members", () => {
    for (const type of ["image", "pdf", "file"] as const) {
      const result = itemContentSchema.safeParse({
        ...baseFields(),
        type,
        attachmentId: "attachment-1",
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("itemContentSchema — rejections", () => {
  it("rejects an unrecognized discriminant", () => {
    const result = itemContentSchema.safeParse({
      ...baseFields(),
      type: "notAType",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a login missing required fields", () => {
    const result = itemContentSchema.safeParse({
      ...baseFields(),
      type: "login",
      // missing username/password/websites
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = itemContentSchema.safeParse({
      tags: [],
      customFields: [],
      type: "custom",
    });
    expect(result.success).toBe(false);
  });
});

describe("customFieldSchema", () => {
  it("accepts every documented custom field type", () => {
    const types = [
      "text",
      "secret",
      "url",
      "email",
      "number",
      "date",
      "multiline",
      "boolean",
      "totp",
    ] as const;
    for (const type of types) {
      const result = customFieldSchema.safeParse({
        id: "f1",
        label: "Field",
        type,
        value: "x",
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unrecognized custom field type", () => {
    const result = customFieldSchema.safeParse({
      id: "f1",
      label: "Field",
      type: "notAType",
      value: "x",
    });
    expect(result.success).toBe(false);
  });
});

describe("vaultItemDocumentSchema", () => {
  function validDoc() {
    return {
      id: "item1",
      ownerId: "alice",
      type: "login" as const,
      revision: 0,
      updatedAt: null,
      createdAt: null,
      deleted: false,
      favorite: false,
      wrappedItemKey: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
      encryptedData: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
      attachmentRefs: [],
    };
  }

  it("accepts a well-formed envelope", () => {
    expect(vaultItemDocumentSchema.safeParse(validDoc()).success).toBe(true);
  });

  it("rejects a document missing favorite", () => {
    const doc = validDoc() as Partial<ReturnType<typeof validDoc>>;
    delete doc.favorite;
    expect(vaultItemDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects a document missing attachmentRefs", () => {
    const doc = validDoc() as Partial<ReturnType<typeof validDoc>>;
    delete doc.attachmentRefs;
    expect(vaultItemDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects an unrecognized type", () => {
    const doc = { ...validDoc(), type: "notAType" };
    expect(vaultItemDocumentSchema.safeParse(doc).success).toBe(false);
  });
});
