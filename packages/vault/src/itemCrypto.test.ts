import { generateKey } from "@kryvex/crypto";
import type {
  ApiKeyContent,
  AttachmentItemContent,
  CardContent,
  CustomItemContent,
  IdentityContent,
  ItemContent,
  LoginContent,
  PinContent,
  RecoveryCodesContent,
  SecureNoteContent,
} from "@kryvex/types";
import { describe, expect, it } from "vitest";
import {
  decryptItemContent,
  encryptItemContent,
  reencryptItemContent,
} from "./itemCrypto";

const DECRYPT_FAILURE_MESSAGE = "Unable to decrypt vault item.";

// Explicit per-key types (not Extract<ItemContent, {type: K}>, and not a
// plain Record<..., ItemContent>): image/pdf/file all share one
// AttachmentItemContent interface whose `type` field is itself a 3-way
// union, so Extract<ItemContent, {type: "image"}> resolves to `never` —
// AttachmentItemContent's `type` isn't assignable to the narrower literal
// "image" alone. Spelling out each key's concrete type sidesteps that.
const SAMPLE_CONTENT: {
  login: LoginContent;
  secureNote: SecureNoteContent;
  identity: IdentityContent;
  card: CardContent;
  pin: PinContent;
  apiKey: ApiKeyContent;
  recoveryCodes: RecoveryCodesContent;
  image: AttachmentItemContent;
  pdf: AttachmentItemContent;
  file: AttachmentItemContent;
  custom: CustomItemContent;
} = {
  login: {
    type: "login",
    title: "Example",
    tags: ["work"],
    customFields: [],
    username: "alice",
    password: "hunter2",
    websites: ["https://example.com"],
  },
  secureNote: {
    type: "secureNote",
    title: "Note",
    tags: [],
    customFields: [],
    body: "top secret",
  },
  identity: {
    type: "identity",
    title: "My identity",
    tags: [],
    customFields: [],
    fullName: "Alice Example",
  },
  card: {
    type: "card",
    title: "Visa",
    tags: [],
    customFields: [],
    cardholderName: "Alice",
    number: "4111111111111111",
    expiry: "12/28",
    cvv: "123",
  },
  pin: {
    type: "pin",
    title: "Garage",
    tags: [],
    customFields: [],
    value: "1234",
  },
  apiKey: {
    type: "apiKey",
    title: "Stripe",
    tags: [],
    customFields: [],
    service: "Stripe",
    key: "sk_live_x",
  },
  recoveryCodes: {
    type: "recoveryCodes",
    title: "GitHub 2FA",
    tags: [],
    customFields: [],
    service: "GitHub",
    codes: [{ code: "abc-123", used: false }],
  },
  image: {
    type: "image",
    title: "Passport photo",
    tags: [],
    customFields: [],
    attachmentId: "att1",
  },
  pdf: {
    type: "pdf",
    title: "Lease",
    tags: [],
    customFields: [],
    attachmentId: "att2",
  },
  file: {
    type: "file",
    title: "Backup key",
    tags: [],
    customFields: [],
    attachmentId: "att3",
  },
  custom: {
    type: "custom",
    title: "Custom item",
    tags: [],
    customFields: [{ id: "f1", label: "Field", type: "text", value: "x" }],
  },
};

describe("encryptItemContent / decryptItemContent round-trip", () => {
  for (const [type, content] of Object.entries(SAMPLE_CONTENT)) {
    it(`round-trips a ${type} item`, () => {
      const vaultEncryptionKey = generateKey();
      const { wrappedItemKey, encryptedData } = encryptItemContent(
        vaultEncryptionKey,
        content,
      );
      const decrypted = decryptItemContent(
        vaultEncryptionKey,
        wrappedItemKey,
        encryptedData,
      );
      expect(decrypted).toEqual(content);
    });
  }
});

describe("encryptItemContent — key isolation", () => {
  it("wraps a fresh, distinct item key on every call", () => {
    const vaultEncryptionKey = generateKey();
    const a = encryptItemContent(vaultEncryptionKey, SAMPLE_CONTENT.pin);
    const b = encryptItemContent(vaultEncryptionKey, SAMPLE_CONTENT.pin);
    expect(a.wrappedItemKey.ciphertext).not.toBe(b.wrappedItemKey.ciphertext);
  });
});

describe("reencryptItemContent", () => {
  it("re-encrypts new content under the same item DEK (wrappedItemKey unchanged)", () => {
    const vaultEncryptionKey = generateKey();
    const { wrappedItemKey } = encryptItemContent(
      vaultEncryptionKey,
      SAMPLE_CONTENT.pin,
    );
    const updatedContent: ItemContent = {
      ...SAMPLE_CONTENT.pin,
      value: "5678",
    };
    const { encryptedData: newEncryptedData } = reencryptItemContent(
      vaultEncryptionKey,
      wrappedItemKey,
      updatedContent,
    );
    const decrypted = decryptItemContent(
      vaultEncryptionKey,
      wrappedItemKey,
      newEncryptedData,
    );
    expect(decrypted).toEqual(updatedContent);
  });

  it("fails closed when the wrong vault key is used to unwrap", () => {
    const { wrappedItemKey } = encryptItemContent(
      generateKey(),
      SAMPLE_CONTENT.pin,
    );
    expect(() =>
      reencryptItemContent(generateKey(), wrappedItemKey, SAMPLE_CONTENT.pin),
    ).toThrow(DECRYPT_FAILURE_MESSAGE);
  });
});

describe("decryptItemContent — fail-closed tamper handling", () => {
  it("fails closed with the wrong vault key", () => {
    const { wrappedItemKey, encryptedData } = encryptItemContent(
      generateKey(),
      SAMPLE_CONTENT.login,
    );
    expect(() =>
      decryptItemContent(generateKey(), wrappedItemKey, encryptedData),
    ).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("fails closed when the wrapped item key is tampered", () => {
    const vaultEncryptionKey = generateKey();
    const { wrappedItemKey, encryptedData } = encryptItemContent(
      vaultEncryptionKey,
      SAMPLE_CONTENT.login,
    );
    const tamperedKey = {
      ...wrappedItemKey,
      ciphertext: wrappedItemKey.ciphertext.slice(0, -2) + "AA",
    };
    expect(() =>
      decryptItemContent(vaultEncryptionKey, tamperedKey, encryptedData),
    ).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("fails closed when the ciphertext is tampered", () => {
    const vaultEncryptionKey = generateKey();
    const { wrappedItemKey, encryptedData } = encryptItemContent(
      vaultEncryptionKey,
      SAMPLE_CONTENT.login,
    );
    const tamperedData = {
      ...encryptedData,
      ciphertext: encryptedData.ciphertext.slice(0, -2) + "AA",
    };
    expect(() =>
      decryptItemContent(vaultEncryptionKey, wrappedItemKey, tamperedData),
    ).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("fails closed when the decrypted payload is not valid ItemContent JSON", () => {
    const vaultEncryptionKey = generateKey();
    const { wrappedItemKey } = encryptItemContent(
      vaultEncryptionKey,
      SAMPLE_CONTENT.login,
    );
    // Re-derive the item key by encrypting garbage under it via a second
    // encryptItemContent-style wrap is not possible without exposing the
    // unwrapped item key, so instead construct an envelope whose plaintext
    // (once unwrapped with the *correct* flow) would be malformed JSON by
    // going through reencryptItemContent with content that still serializes
    // to valid JSON, then corrupting a byte that breaks JSON parsing without
    // breaking the AEAD tag is not feasible either (any bit flip breaks the
    // tag). Instead assert the schema-validation path directly: content
    // that serializes but does not satisfy itemContentSchema.
    const invalidContent = { type: "login" } as unknown as ItemContent;
    const { encryptedData: badEncryptedData } = reencryptItemContent(
      vaultEncryptionKey,
      wrappedItemKey,
      invalidContent,
    );
    expect(() =>
      decryptItemContent(vaultEncryptionKey, wrappedItemKey, badEncryptedData),
    ).toThrow(DECRYPT_FAILURE_MESSAGE);
  });
});
