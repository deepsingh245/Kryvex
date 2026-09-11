import { describe, expect, it } from "vitest";
import {
  base64ToBytes,
  bytesToBase64,
  decryptBytes,
  encryptBytes,
  generateKey,
} from "./aead";

const DECRYPT_FAILURE_MESSAGE = "Unable to decrypt vault item.";

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

describe("generateKey", () => {
  it("returns 32 random bytes", () => {
    const key = generateKey();
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });

  it("is not deterministic across calls", () => {
    expect(generateKey()).not.toEqual(generateKey());
  });
});

describe("encryptBytes / decryptBytes round-trip", () => {
  it("decrypts back to the original plaintext", () => {
    const key = generateKey();
    const plaintext = textBytes("correct horse battery staple");
    const envelope = encryptBytes(key, plaintext);
    expect(decryptBytes(key, envelope)).toEqual(plaintext);
  });

  it("round-trips empty plaintext", () => {
    const key = generateKey();
    const envelope = encryptBytes(key, new Uint8Array());
    expect(decryptBytes(key, envelope)).toEqual(new Uint8Array());
  });

  it("produces ciphertext that differs from the plaintext", () => {
    const key = generateKey();
    const plaintext = textBytes("some vault item content");
    const envelope = encryptBytes(key, plaintext);
    expect(base64ToBytes(envelope.ciphertext)).not.toEqual(plaintext);
  });

  it("produces a fresh random nonce on every call (no reuse)", () => {
    const key = generateKey();
    const plaintext = textBytes("same plaintext every time");
    const a = encryptBytes(key, plaintext);
    const b = encryptBytes(key, plaintext);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("produces the documented envelope shape", () => {
    const envelope = encryptBytes(generateKey(), textBytes("x"));
    expect(envelope.v).toBe(1);
    expect(envelope.alg).toBe("AES-256-GCM");
    expect(base64ToBytes(envelope.nonce).length).toBe(12);
  });
});

describe("decryptBytes — fail-closed tamper handling (CRYPTOGRAPHIC_ARCHITECTURE.md §11)", () => {
  it("rejects the wrong key", () => {
    const envelope = encryptBytes(generateKey(), textBytes("secret"));
    expect(() => decryptBytes(generateKey(), envelope)).toThrow(
      DECRYPT_FAILURE_MESSAGE,
    );
  });

  it("rejects a modified auth tag / corrupted ciphertext", () => {
    const key = generateKey();
    const envelope = encryptBytes(key, textBytes("secret"));
    const ciphertextBytes = base64ToBytes(envelope.ciphertext);
    ciphertextBytes[ciphertextBytes.length - 1]! ^= 0xff; // flip a bit in the appended tag
    const tampered = {
      ...envelope,
      ciphertext: bytesToBase64(ciphertextBytes),
    };
    expect(() => decryptBytes(key, tampered)).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("rejects a modified nonce", () => {
    const key = generateKey();
    const envelope = encryptBytes(key, textBytes("secret"));
    const nonceBytes = base64ToBytes(envelope.nonce);
    nonceBytes[0]! ^= 0xff;
    const tampered = { ...envelope, nonce: bytesToBase64(nonceBytes) };
    expect(() => decryptBytes(key, tampered)).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("rejects a shorter-than-96-bit nonce even though the underlying library would accept it", () => {
    const key = generateKey();
    const envelope = encryptBytes(key, textBytes("secret"));
    const shortNonce = base64ToBytes(envelope.nonce).slice(0, 8);
    const tampered = { ...envelope, nonce: bytesToBase64(shortNonce) };
    expect(() => decryptBytes(key, tampered)).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("rejects an unknown envelope version", () => {
    const key = generateKey();
    const envelope = encryptBytes(key, textBytes("secret"));
    const tampered = { ...envelope, v: 2 as 1 };
    expect(() => decryptBytes(key, tampered)).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("rejects an unknown algorithm", () => {
    const key = generateKey();
    const envelope = encryptBytes(key, textBytes("secret"));
    const tampered = { ...envelope, alg: "AES-128-CBC" as "AES-256-GCM" };
    expect(() => decryptBytes(key, tampered)).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("rejects malformed base64 in the ciphertext field", () => {
    const key = generateKey();
    const envelope = encryptBytes(key, textBytes("secret"));
    const tampered = { ...envelope, ciphertext: "not valid base64!!!" };
    expect(() => decryptBytes(key, tampered)).toThrow(DECRYPT_FAILURE_MESSAGE);
  });

  it("rejects a key that is not 32 bytes", () => {
    const envelope = encryptBytes(generateKey(), textBytes("secret"));
    expect(() => decryptBytes(new Uint8Array(16), envelope)).toThrow(
      DECRYPT_FAILURE_MESSAGE,
    );
  });

  it("never returns partial plaintext on a failed decrypt", () => {
    const key = generateKey();
    const envelope = encryptBytes(key, textBytes("very secret content"));
    const ciphertextBytes = base64ToBytes(envelope.ciphertext);
    ciphertextBytes[0]! ^= 0xff;
    const tampered = {
      ...envelope,
      ciphertext: bytesToBase64(ciphertextBytes),
    };
    let result: Uint8Array | undefined;
    try {
      result = decryptBytes(key, tampered);
    } catch {
      // expected
    }
    expect(result).toBeUndefined();
  });
});

describe("encryptBytes — key validation", () => {
  it("rejects a key that is not 32 bytes", () => {
    expect(() => encryptBytes(new Uint8Array(16), textBytes("x"))).toThrow();
  });
});

describe("bytesToBase64 / base64ToBytes", () => {
  it("round-trips arbitrary bytes", () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254, 128, 127]);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
  });

  it("round-trips empty input", () => {
    expect(base64ToBytes(bytesToBase64(new Uint8Array()))).toEqual(
      new Uint8Array(),
    );
  });
});
