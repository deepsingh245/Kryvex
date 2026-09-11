/**
 * Exercises the real Firebase Auth + Firestore + Functions emulators — the
 * sign-up/sign-in/prelogin flow end-to-end. Deliberately separate from
 * tests/security's @firebase/rules-unit-testing-based tests, which use
 * synthetic auth contexts and never touch the Auth emulator. Only runs via
 * `pnpm test:auth` (firebase emulators:exec), never plain `pnpm test`.
 */

import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  bytesToHex,
  decryptBytes,
  deriveAuthAndStretchedKey,
  deriveKdfMaterial,
  encryptBytes,
  generateKdfSalt,
  generateKey,
  hexToBytes,
} from "@kryvex/crypto";
import {
  createUserProfileDocument,
  fetchUserProfileDocument,
  initializeKryvexFirebase,
  resolveKdfParamsForEmail,
  signInWithAuthSecret,
  signUpWithAuthSecret,
  type KryvexFirebaseServices,
} from "@kryvex/firebase";
import type { EncryptedEnvelope } from "@kryvex/types";

// Low-cost params — never used outside tests.
const FAST_PARAMS = {
  memoryKiB: 8,
  iterations: 1,
  parallelism: 1,
  version: 0x13,
};

let services: KryvexFirebaseServices;

beforeAll(() => {
  services = initializeKryvexFirebase(
    {
      apiKey: "demo-api-key",
      authDomain: "demo-kryvex.firebaseapp.com",
      projectId: "demo-kryvex",
      storageBucket: "demo-kryvex.appspot.com",
      appId: "demo-app-id",
    },
    { useEmulator: "true", host: "localhost" },
  );
});

afterAll(async () => {
  await services.auth.signOut();
});

function uniqueEmail(): string {
  return `${randomUUID()}@example.com`;
}

async function signUpFixture(email: string, masterPassword: string) {
  const salt = generateKdfSalt();
  const { masterKey } = await deriveKdfMaterial(
    masterPassword,
    salt,
    FAST_PARAMS,
  );
  const { authSecret, stretchedMasterKey } =
    deriveAuthAndStretchedKey(masterKey);

  const user = await signUpWithAuthSecret(services.auth, email, authSecret);
  await createUserProfileDocument(services.firestore, user.uid, {
    email,
    kdfSalt: bytesToHex(salt),
    kdfParams: FAST_PARAMS,
    settings: {
      autoLockMinutes: 5,
      clipboardClearSeconds: 30,
      biometricUnlockEnabled: false,
    },
  });

  return { user, salt, stretchedMasterKey };
}

// Mirrors what apps/web's VaultProvider.signUp actually does with the
// Vault Encryption Key — generate it, wrap it under the Stretched Master
// Key, and write it as protectedVaultKey on the profile doc.
async function signUpFixtureWithVek(email: string, masterPassword: string) {
  const salt = generateKdfSalt();
  const { masterKey } = await deriveKdfMaterial(
    masterPassword,
    salt,
    FAST_PARAMS,
  );
  const { authSecret, stretchedMasterKey } =
    deriveAuthAndStretchedKey(masterKey);
  const vaultEncryptionKey = generateKey();
  const protectedVaultKey = encryptBytes(
    stretchedMasterKey,
    vaultEncryptionKey,
  );

  const user = await signUpWithAuthSecret(services.auth, email, authSecret);
  await createUserProfileDocument(services.firestore, user.uid, {
    email,
    kdfSalt: bytesToHex(salt),
    kdfParams: FAST_PARAMS,
    protectedVaultKey,
    settings: {
      autoLockMinutes: 5,
      clipboardClearSeconds: 30,
      biometricUnlockEnabled: false,
    },
  });

  return { user, salt, stretchedMasterKey, vaultEncryptionKey };
}

describe("sign up", () => {
  it("creates a Firebase user and a profile doc with kdfSalt/kdfParams", async () => {
    const email = uniqueEmail();
    const { user, salt } = await signUpFixture(
      email,
      "correct horse battery staple",
    );

    expect(user.email).toBe(email);

    const profile = (await fetchUserProfileDocument(
      services.firestore,
      user.uid,
    )) as {
      email: string;
      kdfSalt: string;
      kdfParams: typeof FAST_PARAMS;
    };
    expect(profile.email).toBe(email);
    expect(profile.kdfSalt).toBe(bytesToHex(salt));
    expect(profile.kdfParams).toEqual(FAST_PARAMS);

    await services.auth.signOut();
  });
});

describe("getKdfParams (prelogin)", () => {
  it("returns the stored salt/params for an existing account", async () => {
    const email = uniqueEmail();
    const { salt } = await signUpFixture(email, "correct horse battery staple");
    await services.auth.signOut();

    const result = (await resolveKdfParamsForEmail(
      services.functions,
      email,
    )) as {
      kdfSalt: string;
      kdfParams: typeof FAST_PARAMS;
    };
    expect(result.kdfSalt).toBe(bytesToHex(salt));
    expect(result.kdfParams).toEqual(FAST_PARAMS);
  });

  it("returns null for a non-existent account", async () => {
    const result = await resolveKdfParamsForEmail(
      services.functions,
      uniqueEmail(),
    );
    expect(result).toBeNull();
  });
});

describe("sign in", () => {
  it("succeeds with the correctly re-derived authSecret", async () => {
    const email = uniqueEmail();
    const masterPassword = "correct horse battery staple";
    await signUpFixture(email, masterPassword);
    await services.auth.signOut();

    const params = (await resolveKdfParamsForEmail(
      services.functions,
      email,
    )) as {
      kdfSalt: string;
      kdfParams: typeof FAST_PARAMS;
    };
    const { masterKey } = await deriveKdfMaterial(
      masterPassword,
      hexToBytes(params.kdfSalt),
      params.kdfParams,
    );
    const { authSecret } = deriveAuthAndStretchedKey(masterKey);

    const user = await signInWithAuthSecret(services.auth, email, authSecret);
    expect(user.email).toBe(email);
  });

  it("fails with a wrong master password", async () => {
    const email = uniqueEmail();
    await signUpFixture(email, "correct horse battery staple");
    await services.auth.signOut();

    const params = (await resolveKdfParamsForEmail(
      services.functions,
      email,
    )) as {
      kdfSalt: string;
      kdfParams: typeof FAST_PARAMS;
    };
    const { masterKey } = await deriveKdfMaterial(
      "a completely different password",
      hexToBytes(params.kdfSalt),
      params.kdfParams,
    );
    const { authSecret } = deriveAuthAndStretchedKey(masterKey);

    await expect(
      signInWithAuthSecret(services.auth, email, authSecret),
    ).rejects.toThrow();
  });
});

describe("Vault Encryption Key wrapping (Phase 3)", () => {
  it("writes a protectedVaultKey that unwraps back to the original VEK", async () => {
    const email = uniqueEmail();
    const { stretchedMasterKey, vaultEncryptionKey } =
      await signUpFixtureWithVek(email, "correct horse battery staple");

    const profile = (await fetchUserProfileDocument(
      services.firestore,
      services.auth.currentUser!.uid,
    )) as { protectedVaultKey: EncryptedEnvelope };

    expect(decryptBytes(stretchedMasterKey, profile.protectedVaultKey)).toEqual(
      vaultEncryptionKey,
    );
  });

  it("sign-in with the correct password can fetch and unwrap the VEK", async () => {
    const email = uniqueEmail();
    const masterPassword = "correct horse battery staple";
    const { vaultEncryptionKey } = await signUpFixtureWithVek(
      email,
      masterPassword,
    );
    await services.auth.signOut();

    const params = (await resolveKdfParamsForEmail(
      services.functions,
      email,
    )) as { kdfSalt: string; kdfParams: typeof FAST_PARAMS };
    const { masterKey } = await deriveKdfMaterial(
      masterPassword,
      hexToBytes(params.kdfSalt),
      params.kdfParams,
    );
    const { authSecret, stretchedMasterKey } =
      deriveAuthAndStretchedKey(masterKey);
    const user = await signInWithAuthSecret(services.auth, email, authSecret);

    const profile = (await fetchUserProfileDocument(
      services.firestore,
      user.uid,
    )) as { protectedVaultKey: EncryptedEnvelope };
    expect(decryptBytes(stretchedMasterKey, profile.protectedVaultKey)).toEqual(
      vaultEncryptionKey,
    );
  });

  it("a wrong master password's Stretched Master Key fails to unwrap the VEK (local fail-closed check)", async () => {
    const email = uniqueEmail();
    await signUpFixtureWithVek(email, "correct horse battery staple");
    // Fetch while still signed in — the security rules require
    // request.auth.uid == uid, and this test only needs the *unwrap* step
    // (not a real re-sign-in) to exercise the wrong-password fail-closed path.
    const profile = (await fetchUserProfileDocument(
      services.firestore,
      services.auth.currentUser!.uid,
    )) as { protectedVaultKey: EncryptedEnvelope };
    await services.auth.signOut();

    const params = (await resolveKdfParamsForEmail(
      services.functions,
      email,
    )) as { kdfSalt: string; kdfParams: typeof FAST_PARAMS };
    const { masterKey } = await deriveKdfMaterial(
      "a completely different password",
      hexToBytes(params.kdfSalt),
      params.kdfParams,
    );
    const { stretchedMasterKey: wrongStretchedMasterKey } =
      deriveAuthAndStretchedKey(masterKey);

    // signInWithAuthSecret would already reject this password against
    // Firebase; this asserts the *local* unwrap (what unlock() now relies
    // on instead of re-authenticating) independently fails closed too.
    expect(() =>
      decryptBytes(wrongStretchedMasterKey, profile.protectedVaultKey),
    ).toThrow("Unable to decrypt vault item.");
  });
});
