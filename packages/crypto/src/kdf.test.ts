import { describe, expect, it } from "vitest";
import {
  DEFAULT_KDF_PARAMS,
  deriveAuthAndStretchedKey,
  deriveKdfMaterial,
  generateKdfSalt,
} from "./kdf";

// Low-cost params for fast tests — never used outside this test file.
const FAST_PARAMS = {
  memoryKiB: 8,
  iterations: 1,
  parallelism: 1,
  version: 0x13,
};

describe("generateKdfSalt", () => {
  it("returns 16 random bytes", () => {
    const salt = generateKdfSalt();
    expect(salt).toBeInstanceOf(Uint8Array);
    expect(salt.length).toBe(16);
  });

  it("is not deterministic across calls", () => {
    const a = generateKdfSalt();
    const b = generateKdfSalt();
    expect(a).not.toEqual(b);
  });
});

describe("deriveKdfMaterial", () => {
  it("is deterministic for the same password/salt/params", async () => {
    const salt = generateKdfSalt();
    const a = await deriveKdfMaterial(
      "correct horse battery staple",
      salt,
      FAST_PARAMS,
    );
    const b = await deriveKdfMaterial(
      "correct horse battery staple",
      salt,
      FAST_PARAMS,
    );
    expect(a.masterKey).toEqual(b.masterKey);
  });

  it("produces a different key for a different password", async () => {
    const salt = generateKdfSalt();
    const a = await deriveKdfMaterial(
      "correct horse battery staple",
      salt,
      FAST_PARAMS,
    );
    const b = await deriveKdfMaterial(
      "wrong password entirely",
      salt,
      FAST_PARAMS,
    );
    expect(a.masterKey).not.toEqual(b.masterKey);
  });

  it("produces a different key for a different salt", async () => {
    const a = await deriveKdfMaterial(
      "correct horse battery staple",
      generateKdfSalt(),
      FAST_PARAMS,
    );
    const b = await deriveKdfMaterial(
      "correct horse battery staple",
      generateKdfSalt(),
      FAST_PARAMS,
    );
    expect(a.masterKey).not.toEqual(b.masterKey);
  });

  it("returns a 32-byte key", async () => {
    const { masterKey } = await deriveKdfMaterial(
      "x",
      generateKdfSalt(),
      FAST_PARAMS,
    );
    expect(masterKey.length).toBe(32);
  });
});

describe("deriveAuthAndStretchedKey", () => {
  it("domain-separates authSecret from stretchedMasterKey", async () => {
    const { masterKey } = await deriveKdfMaterial(
      "x",
      generateKdfSalt(),
      FAST_PARAMS,
    );
    const { authSecret, stretchedMasterKey } =
      deriveAuthAndStretchedKey(masterKey);
    expect(authSecret).not.toBe(
      Buffer.from(stretchedMasterKey).toString("hex"),
    );
  });

  it("authSecret is a 64-char hex string (32 bytes)", async () => {
    const { masterKey } = await deriveKdfMaterial(
      "x",
      generateKdfSalt(),
      FAST_PARAMS,
    );
    const { authSecret } = deriveAuthAndStretchedKey(masterKey);
    expect(authSecret).toMatch(/^[0-9a-f]{64}$/);
  });

  it("stretchedMasterKey is 32 bytes", async () => {
    const { masterKey } = await deriveKdfMaterial(
      "x",
      generateKdfSalt(),
      FAST_PARAMS,
    );
    const { stretchedMasterKey } = deriveAuthAndStretchedKey(masterKey);
    expect(stretchedMasterKey.length).toBe(32);
  });

  it("is deterministic for the same masterKey", async () => {
    const { masterKey } = await deriveKdfMaterial(
      "x",
      generateKdfSalt(),
      FAST_PARAMS,
    );
    const a = deriveAuthAndStretchedKey(masterKey);
    const b = deriveAuthAndStretchedKey(masterKey);
    expect(a.authSecret).toBe(b.authSecret);
    expect(a.stretchedMasterKey).toEqual(b.stretchedMasterKey);
  });
});

describe("DEFAULT_KDF_PARAMS", () => {
  it("targets at least 64 MiB per docs/CRYPTOGRAPHIC_ARCHITECTURE.md §6", () => {
    expect(DEFAULT_KDF_PARAMS.memoryKiB).toBeGreaterThanOrEqual(65536);
  });
});
