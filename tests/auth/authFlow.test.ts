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
  confirmVaultRecovery,
  createUserProfileDocument,
  fetchUserProfileDocument,
  initializeKryvexFirebase,
  resolveKdfParamsForEmail,
  resolveRecoveryEnvelopeForEmail,
  sendVaultRecoveryEmail,
  signInWithAuthSecret,
  signUpWithAuthSecret,
  updateUserProfileDocument,
  verifyRecoveryCode,
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

// The Auth emulator exposes every pending out-of-band code (password reset,
// email verification, ...) via its own REST testing endpoint — no real
// email delivery needed. See docs/RECOVERY.md §3.
async function fetchOobCodeForEmail(email: string): Promise<string> {
  const res = await fetch(
    "http://localhost:9099/emulator/v1/projects/demo-kryvex/oobCodes",
  );
  const body = (await res.json()) as {
    oobCodes: { email: string; oobCode: string; requestType: string }[];
  };
  const match = [...body.oobCodes]
    .reverse()
    .find((c) => c.email === email && c.requestType === "PASSWORD_RESET");
  if (!match) throw new Error(`No pending oobCode found for ${email}`);
  return match.oobCode;
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

describe("vault recovery (Recovery Key + Emergency Kit, Phase 7w)", () => {
  it("recovers the vault end-to-end: email link + Recovery Key, new master password, VEK unchanged", async () => {
    const email = uniqueEmail();
    const oldMasterPassword = "correct horse battery staple";
    const { vaultEncryptionKey } = await signUpFixtureWithVek(
      email,
      oldMasterPassword,
    );

    // Same second, independent wrapping VaultProvider.signUp does.
    const recoveryKeyBytes = generateKey();
    const protectedVaultKeyByRecovery = encryptBytes(
      recoveryKeyBytes,
      vaultEncryptionKey,
    );
    await updateUserProfileDocument(
      services.firestore,
      services.auth.currentUser!.uid,
      { protectedVaultKeyByRecovery },
    );
    await services.auth.signOut();

    // "Forgot master password" — trigger the reset email and grab the
    // oobCode from the emulator directly (no real email delivery).
    await sendVaultRecoveryEmail(
      services.auth,
      email,
      "http://localhost:3000/recover/confirm",
    );
    const oobCode = await fetchOobCodeForEmail(email);

    // Client side of recoverVault (mirrors VaultProvider.tsx exactly).
    const resolvedEmail = await verifyRecoveryCode(services.auth, oobCode);
    expect(resolvedEmail).toBe(email);

    const envelope = (await resolveRecoveryEnvelopeForEmail(
      services.functions,
      email,
    )) as { protectedVaultKeyByRecovery: EncryptedEnvelope } | null;
    expect(envelope?.protectedVaultKeyByRecovery).toBeDefined();

    const recoveredVek = decryptBytes(
      recoveryKeyBytes,
      envelope!.protectedVaultKeyByRecovery,
    );
    expect(recoveredVek).toEqual(vaultEncryptionKey);

    const newMasterPassword = "a brand new master password";
    const newSalt = generateKdfSalt();
    const { masterKey } = await deriveKdfMaterial(
      newMasterPassword,
      newSalt,
      FAST_PARAMS,
    );
    const { authSecret: newAuthSecret, stretchedMasterKey } =
      deriveAuthAndStretchedKey(masterKey);
    const newProtectedVaultKey = encryptBytes(stretchedMasterKey, recoveredVek);

    await confirmVaultRecovery(services.auth, oobCode, newAuthSecret);
    const user = await signInWithAuthSecret(
      services.auth,
      email,
      newAuthSecret,
    );
    await updateUserProfileDocument(services.firestore, user.uid, {
      kdfSalt: bytesToHex(newSalt),
      kdfParams: FAST_PARAMS,
      protectedVaultKey: newProtectedVaultKey,
    });
    await services.auth.signOut();

    // Old master password's derived authSecret no longer signs in.
    const { masterKey: oldMasterKey } = await deriveKdfMaterial(
      oldMasterPassword,
      newSalt,
      FAST_PARAMS,
    );
    const { authSecret: oldAuthSecret } =
      deriveAuthAndStretchedKey(oldMasterKey);
    await expect(
      signInWithAuthSecret(services.auth, email, oldAuthSecret),
    ).rejects.toThrow();

    // New master password signs in and unwraps back to the *original* VEK
    // — existing vault content is untouched by recovery.
    const signedInAgain = await signInWithAuthSecret(
      services.auth,
      email,
      newAuthSecret,
    );
    const finalProfile = (await fetchUserProfileDocument(
      services.firestore,
      signedInAgain.uid,
    )) as { protectedVaultKey: EncryptedEnvelope };
    expect(
      decryptBytes(stretchedMasterKey, finalProfile.protectedVaultKey),
    ).toEqual(vaultEncryptionKey);
  });

  it("getRecoveryEnvelope returns null when no recovery key was ever set up", async () => {
    const email = uniqueEmail();
    await signUpFixtureWithVek(email, "correct horse battery staple");
    await services.auth.signOut();

    const result = await resolveRecoveryEnvelopeForEmail(
      services.functions,
      email,
    );
    expect(result).toBeNull();
  });

  it("getRecoveryEnvelope returns null for a non-existent account", async () => {
    const result = await resolveRecoveryEnvelopeForEmail(
      services.functions,
      uniqueEmail(),
    );
    expect(result).toBeNull();
  });
});
