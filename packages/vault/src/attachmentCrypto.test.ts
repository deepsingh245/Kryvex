import { generateKey } from "@kryvex/crypto";
import { describe, expect, it } from "vitest";
import {
  attachmentEnvelopeToBlob,
  blobToAttachmentEnvelope,
  decryptAttachmentContent,
  decryptAttachmentFileName,
  encryptAttachment,
} from "./attachmentCrypto";

const DECRYPT_FAILURE_MESSAGE = "Unable to decrypt vault attachment.";

function sampleFileBytes(): Uint8Array {
  return new TextEncoder().encode("not actually a JPEG, just test bytes");
}

describe("encryptAttachment / decryptAttachmentContent round-trip", () => {
  it("round-trips file content", () => {
    const vaultEncryptionKey = generateKey();
    const fileBytes = sampleFileBytes();
    const { wrappedAttachmentKey, encryptedData } = encryptAttachment(
      vaultEncryptionKey,
      fileBytes,
      "passport.jpg",
    );
    const decrypted = decryptAttachmentContent(
      vaultEncryptionKey,
      wrappedAttachmentKey,
      encryptedData,
    );
    expect(decrypted).toEqual(fileBytes);
  });

  it("round-trips the filename", () => {
    const vaultEncryptionKey = generateKey();
    const { wrappedAttachmentKey, encryptedFileName } = encryptAttachment(
      vaultEncryptionKey,
      sampleFileBytes(),
      "passport.jpg",
    );
    const decrypted = decryptAttachmentFileName(
      vaultEncryptionKey,
      wrappedAttachmentKey,
      encryptedFileName,
    );
    expect(decrypted).toBe("passport.jpg");
  });
});

describe("attachmentEnvelopeToBlob / blobToAttachmentEnvelope round-trip", () => {
  it("round-trips content through the blob framing and decrypts correctly", () => {
    const vaultEncryptionKey = generateKey();
    const fileBytes = sampleFileBytes();
    const { wrappedAttachmentKey, encryptedData } = encryptAttachment(
      vaultEncryptionKey,
      fileBytes,
      "a",
    );

    const blob = attachmentEnvelopeToBlob(encryptedData);
    const reconstructed = blobToAttachmentEnvelope(blob);

    const decrypted = decryptAttachmentContent(
      vaultEncryptionKey,
      wrappedAttachmentKey,
      reconstructed,
    );
    expect(decrypted).toEqual(fileBytes);
  });

  it("frames the blob as nonce bytes followed by ciphertext bytes", () => {
    const { encryptedData } = encryptAttachment(
      generateKey(),
      sampleFileBytes(),
      "a",
    );
    const blob = attachmentEnvelopeToBlob(encryptedData);
    const reconstructed = blobToAttachmentEnvelope(blob);
    expect(reconstructed.nonce).toBe(encryptedData.nonce);
    expect(reconstructed.ciphertext).toBe(encryptedData.ciphertext);
  });
});

describe("encryptAttachment — key isolation", () => {
  it("wraps a fresh, distinct attachment key on every call", () => {
    const vaultEncryptionKey = generateKey();
    const a = encryptAttachment(vaultEncryptionKey, sampleFileBytes(), "a");
    const b = encryptAttachment(vaultEncryptionKey, sampleFileBytes(), "a");
    expect(a.wrappedAttachmentKey.ciphertext).not.toBe(
      b.wrappedAttachmentKey.ciphertext,
    );
  });
});

describe("decryptAttachmentContent / decryptAttachmentFileName — fail-closed tamper handling", () => {
  it("fails closed with the wrong vault key", () => {
    const { wrappedAttachmentKey, encryptedData } = encryptAttachment(
      generateKey(),
      sampleFileBytes(),
      "a",
    );
    expect(() =>
      decryptAttachmentContent(
        generateKey(),
        wrappedAttachmentKey,
        encryptedData,
      ),
    ).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("fails closed when the wrapped attachment key is tampered", () => {
    const vaultEncryptionKey = generateKey();
    const { wrappedAttachmentKey, encryptedData } = encryptAttachment(
      vaultEncryptionKey,
      sampleFileBytes(),
      "a",
    );
    const tamperedKey = {
      ...wrappedAttachmentKey,
      ciphertext: wrappedAttachmentKey.ciphertext.slice(0, -2) + "AA",
    };
    expect(() =>
      decryptAttachmentContent(vaultEncryptionKey, tamperedKey, encryptedData),
    ).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("fails closed when the file ciphertext is tampered", () => {
    const vaultEncryptionKey = generateKey();
    const { wrappedAttachmentKey, encryptedData } = encryptAttachment(
      vaultEncryptionKey,
      sampleFileBytes(),
      "a",
    );
    const tamperedData = {
      ...encryptedData,
      ciphertext: encryptedData.ciphertext.slice(0, -2) + "AA",
    };
    expect(() =>
      decryptAttachmentContent(
        vaultEncryptionKey,
        wrappedAttachmentKey,
        tamperedData,
      ),
    ).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("fails closed when the filename ciphertext is tampered", () => {
    const vaultEncryptionKey = generateKey();
    const { wrappedAttachmentKey, encryptedFileName } = encryptAttachment(
      vaultEncryptionKey,
      sampleFileBytes(),
      "a",
    );
    const tampered = {
      ...encryptedFileName,
      ciphertext: encryptedFileName.ciphertext.slice(0, -2) + "AA",
    };
    expect(() =>
      decryptAttachmentFileName(
        vaultEncryptionKey,
        wrappedAttachmentKey,
        tampered,
      ),
    ).toThrow(DECRYPT_FAILURE_MESSAGE);
  });
});
