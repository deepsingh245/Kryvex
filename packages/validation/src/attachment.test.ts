import { describe, expect, it } from "vitest";
import { attachmentDocumentSchema } from "./attachment";

function validEnvelope() {
  return {
    v: 1 as const,
    alg: "AES-256-GCM" as const,
    nonce: "n",
    ciphertext: "c",
  };
}

function validDoc(overrides: Record<string, unknown> = {}) {
  return {
    id: "att1",
    ownerId: "alice",
    itemId: "item1",
    revision: 0,
    updatedAt: null,
    deleted: false,
    wrappedAttachmentKey: validEnvelope(),
    mimeType: "image/png",
    sizeBytes: 1024,
    storagePath: "users/alice/attachments/att1",
    ...overrides,
  };
}

describe("attachmentDocumentSchema", () => {
  it("accepts a valid document without encryptedFileName", () => {
    expect(attachmentDocumentSchema.safeParse(validDoc()).success).toBe(true);
  });

  it("accepts a valid document with encryptedFileName", () => {
    const result = attachmentDocumentSchema.safeParse(
      validDoc({ encryptedFileName: validEnvelope() }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const doc = validDoc() as Record<string, unknown>;
    delete doc.storagePath;
    expect(attachmentDocumentSchema.safeParse(doc).success).toBe(false);
  });

  it("rejects a negative sizeBytes", () => {
    const result = attachmentDocumentSchema.safeParse(
      validDoc({ sizeBytes: -1 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a negative revision", () => {
    const result = attachmentDocumentSchema.safeParse(
      validDoc({ revision: -1 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects an empty mimeType", () => {
    const result = attachmentDocumentSchema.safeParse(
      validDoc({ mimeType: "" }),
    );
    expect(result.success).toBe(false);
  });
});
