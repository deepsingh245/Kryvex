/**
 * Proves the emulator + firestore.rules + this test harness actually work
 * together end-to-end (docs/FIREBASE_SECURITY.md §7). Only runs against the
 * Firebase Emulator Suite via `pnpm test:security` (see root package.json) —
 * never against production. The full required test matrix from
 * FIREBASE_SECURITY.md §7 is filled in starting Phase 2, once real item
 * writes exist to exercise the compare-and-swap revision rule.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulesPath = path.join(
  __dirname,
  "..",
  "..",
  "firebase",
  "firestore.rules",
);

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-kryvex",
    firestore: { rules: readFileSync(rulesPath, "utf8") },
  });
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("firestore.rules — users/{uid}", () => {
  it("denies an unauthenticated read of any profile", async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(unauthedDb.doc("users/alice").get());
  });

  it("denies user A reading user B's profile", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.doc("users/bob").get());
  });

  it("allows a user to read their own profile", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(aliceDb.doc("users/alice").get());
  });
});

describe("firestore.rules — users/{uid} kdfParams floor", () => {
  const VALID_KDF_PARAMS = { memoryKiB: 65536, iterations: 3, parallelism: 1 };

  function profile(kdfParams: Record<string, unknown>) {
    return {
      uid: "alice",
      email: "alice@example.com",
      kdfSalt: "x",
      kdfParams,
      createdAt: new Date(),
      settings: {
        autoLockMinutes: 5,
        clipboardClearSeconds: 30,
        biometricUnlockEnabled: false,
      },
    };
  }

  it("allows creating a profile with kdfParams at the documented floor", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      aliceDb.doc("users/alice").set(profile(VALID_KDF_PARAMS)),
    );
  });

  it("denies creating a profile with memoryKiB below the 64 MiB floor", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb
        .doc("users/alice")
        .set(profile({ ...VALID_KDF_PARAMS, memoryKiB: 1024 })),
    );
  });

  it("denies creating a profile with iterations below the floor", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb
        .doc("users/alice")
        .set(profile({ ...VALID_KDF_PARAMS, iterations: 1 })),
    );
  });

  it("denies creating a profile with parallelism other than 1", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb
        .doc("users/alice")
        .set(profile({ ...VALID_KDF_PARAMS, parallelism: 4 })),
    );
  });

  it("denies weakening kdfParams on update", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("users/alice").set(profile(VALID_KDF_PARAMS));
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb
        .doc("users/alice")
        .set(profile({ ...VALID_KDF_PARAMS, memoryKiB: 512 }), { merge: true }),
    );
  });

  it("allows an update that doesn't touch kdfParams at all", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("users/alice").set(profile(VALID_KDF_PARAMS));
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      aliceDb.doc("users/alice").set(
        { settings: { autoLockMinutes: 15, clipboardClearSeconds: 60, biometricUnlockEnabled: true } },
        { merge: true },
      ),
    );
  });
});

describe("firestore.rules — users/{uid}/items/{itemId}", () => {
  it("denies user A reading user B's items", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.doc("users/bob/items/item1").get());
  });

  it("denies creating an item with a mismatched ownerId", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb.doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "bob", // spoofed — must equal the authenticated uid
        type: "login",
        revision: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: false,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      }),
    );
  });

  it("allows creating a well-formed item owned by the caller", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      aliceDb.doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "alice",
        type: "login",
        revision: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: false,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      }),
    );
  });

  it("denies creating an item missing the favorite field", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb.doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "alice",
        type: "login",
        revision: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      }),
    );
  });

  it("denies creating an item missing the attachmentRefs field", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb.doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "alice",
        type: "login",
        revision: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: false,
        wrappedItemKey: {},
        encryptedData: {},
      }),
    );
  });

  it("denies creating an item with an unrecognized type", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb.doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "alice",
        type: "notAType",
        revision: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: false,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      }),
    );
  });

  it("allows creating items of other recognized types (not just login)", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    for (const type of ["secureNote", "custom"]) {
      await assertSucceeds(
        aliceDb.doc(`users/alice/items/${type}-item`).set({
          id: `${type}-item`,
          ownerId: "alice",
          type,
          revision: 0,
          updatedAt: new Date(),
          createdAt: new Date(),
          deleted: false,
          favorite: false,
          wrappedItemKey: {},
          encryptedData: {},
          attachmentRefs: [],
        }),
      );
    }
  });

  it("denies a hard delete of an item", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "alice",
        type: "login",
        revision: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: false,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.doc("users/alice/items/item1").delete());
  });

  it("denies an update that does not increment the revision", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "alice",
        type: "login",
        revision: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: false,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb.doc("users/alice/items/item1").set(
        {
          id: "item1",
          ownerId: "alice",
          type: "login",
          revision: 0, // stale — must be exactly resource.data.revision + 1
          updatedAt: new Date(),
          createdAt: new Date(),
          deleted: false,
          favorite: false,
          wrappedItemKey: {},
          encryptedData: {
            v: 1,
            alg: "AES-256-GCM",
            nonce: "x",
            ciphertext: "y",
          },
          attachmentRefs: [],
        },
        { merge: true },
      ),
    );
  });

  it("allows a favorite-toggle update with the revision correctly incremented", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "alice",
        type: "login",
        revision: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: false,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      aliceDb.doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "alice",
        type: "login",
        revision: 1,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: true,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      }),
    );
  });

  it("denies an update that changes ownerId on an existing item", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "alice",
        type: "login",
        revision: 0,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: false,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      });
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb.doc("users/alice/items/item1").set({
        id: "item1",
        ownerId: "bob",
        type: "login",
        revision: 1,
        updatedAt: new Date(),
        createdAt: new Date(),
        deleted: false,
        favorite: false,
        wrappedItemKey: {},
        encryptedData: {},
        attachmentRefs: [],
      }),
    );
  });
});

describe("firestore.rules — users/{uid}/attachments/{attachmentId}", () => {
  function validAttachment(overrides: Record<string, unknown> = {}) {
    return {
      id: "att1",
      ownerId: "alice",
      itemId: "item1",
      revision: 0,
      updatedAt: new Date(),
      deleted: false,
      wrappedAttachmentKey: {},
      mimeType: "image/png",
      sizeBytes: 1024,
      storagePath: "users/alice/attachments/att1",
      ...overrides,
    };
  }

  it("denies user A reading user B's attachments", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.doc("users/bob/attachments/att1").get());
  });

  it("denies creating an attachment with a mismatched ownerId", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb
        .doc("users/alice/attachments/att1")
        .set(validAttachment({ ownerId: "bob" })),
    );
  });

  it("allows creating a well-formed attachment owned by the caller", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      aliceDb.doc("users/alice/attachments/att1").set(validAttachment()),
    );
  });

  it("denies creating an attachment missing the storagePath field", async () => {
    const doc = validAttachment() as Record<string, unknown>;
    delete doc.storagePath;
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.doc("users/alice/attachments/att1").set(doc));
  });

  it("denies creating an attachment with a negative sizeBytes", async () => {
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb
        .doc("users/alice/attachments/att1")
        .set(validAttachment({ sizeBytes: -1 })),
    );
  });

  it("denies a hard delete of an attachment", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc("users/alice/attachments/att1")
        .set(validAttachment());
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(aliceDb.doc("users/alice/attachments/att1").delete());
  });

  it("denies an update that does not increment the revision", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc("users/alice/attachments/att1")
        .set(validAttachment());
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertFails(
      aliceDb
        .doc("users/alice/attachments/att1")
        .set(validAttachment(), { merge: true }),
    );
  });

  it("allows a tombstone update with the revision correctly incremented", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context
        .firestore()
        .doc("users/alice/attachments/att1")
        .set(validAttachment());
    });
    const aliceDb = testEnv.authenticatedContext("alice").firestore();
    await assertSucceeds(
      aliceDb
        .doc("users/alice/attachments/att1")
        .set(validAttachment({ revision: 1, deleted: true })),
    );
  });
});

describe("firestore.rules sanity", () => {
  it("loaded a non-empty ruleset", () => {
    expect(readFileSync(rulesPath, "utf8").length).toBeGreaterThan(0);
  });
});
