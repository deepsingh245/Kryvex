import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateKey } from "@kryvex/crypto";
import {
  BiometricUnsupportedError,
  clearAllBiometric,
  enrollBiometric,
  hasBiometricEnrollment,
  unlockWithBiometric,
} from "./biometric";

// A fake authenticator: PRF output is a deterministic function of the salt,
// like a real one is of (credential secret, salt).
function installAuthenticator(opts: { prf?: boolean; cancel?: boolean } = {}) {
  const prfEnabled = opts.prf ?? true;
  const secret = generateKey();
  const prfFor = (salt: ArrayBuffer) => {
    const out = new Uint8Array(32);
    const s = new Uint8Array(salt);
    for (let i = 0; i < 32; i++)
      out[i] = (secret[i] ?? 0) ^ (s[i % s.length] ?? 0);
    return out.buffer;
  };
  vi.stubGlobal("PublicKeyCredential", {
    isUserVerifyingPlatformAuthenticatorAvailable: async () => true,
  });
  Object.defineProperty(navigator, "credentials", {
    configurable: true,
    value: {
      create: vi.fn(async () => ({
        rawId: new Uint8Array([1, 2, 3]).buffer,
        getClientExtensionResults: () => ({ prf: { enabled: prfEnabled } }),
      })),
      get: vi.fn(
        async (o: {
          publicKey: { extensions: { prf: { eval: { first: ArrayBuffer } } } };
        }) => {
          if (opts.cancel)
            throw new DOMException("cancelled", "NotAllowedError");
          return {
            getClientExtensionResults: () =>
              prfEnabled
                ? {
                    prf: {
                      results: {
                        first: prfFor(o.publicKey.extensions.prf.eval.first),
                      },
                    },
                  }
                : {},
          };
        },
      ),
    },
  });
}

describe("biometric unlock", () => {
  beforeEach(async () => {
    await clearAllBiometric();
  });

  it("round-trips the Vault Encryption Key through enroll -> unlock", async () => {
    installAuthenticator();
    const vek = generateKey();
    await enrollBiometric("u1", "a@b.com", vek);
    expect(await hasBiometricEnrollment("u1")).toBe(true);
    expect(await unlockWithBiometric("u1")).toEqual(vek);
  });

  it("requests a discoverable credential so Android Chrome uses Credential Manager", async () => {
    installAuthenticator();
    await enrollBiometric("u1", "a@b.com", generateKey());

    expect(navigator.credentials.create).toHaveBeenCalledWith(
      expect.objectContaining({
        publicKey: expect.objectContaining({
          authenticatorSelection: expect.objectContaining({
            authenticatorAttachment: "platform",
            residentKey: "required",
            userVerification: "required",
          }),
        }),
      }),
    );
  });

  it("rejects enrollment when the authenticator has no PRF support", async () => {
    installAuthenticator({ prf: false });
    await expect(
      enrollBiometric("u1", "a@b.com", generateKey()),
    ).rejects.toBeInstanceOf(BiometricUnsupportedError);
    expect(await hasBiometricEnrollment("u1")).toBe(false);
  });

  it("fails when the biometric prompt is cancelled and keeps the enrollment", async () => {
    installAuthenticator();
    await enrollBiometric("u1", "a@b.com", generateKey());
    installAuthenticator({ cancel: true });
    await expect(unlockWithBiometric("u1")).rejects.toThrow();
    expect(await hasBiometricEnrollment("u1")).toBe(true);
  });

  it("fails closed (and drops the enrollment) if a different authenticator secret is used", async () => {
    installAuthenticator();
    await enrollBiometric("u1", "a@b.com", generateKey());
    installAuthenticator(); // new random secret => different PRF output
    await expect(unlockWithBiometric("u1")).rejects.toThrow();
    expect(await hasBiometricEnrollment("u1")).toBe(false);
  });

  it("clearAllBiometric removes every enrollment", async () => {
    installAuthenticator();
    await enrollBiometric("u1", "a@b.com", generateKey());
    await clearAllBiometric();
    expect(await hasBiometricEnrollment("u1")).toBe(false);
  });
});
