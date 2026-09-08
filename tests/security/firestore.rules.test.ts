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
        wrappedItemKey: {},
        encryptedData: {},
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
        wrappedItemKey: {},
        encryptedData: {},
      }),
    );
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
        wrappedItemKey: {},
        encryptedData: {},
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
        wrappedItemKey: {},
        encryptedData: {},
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
          wrappedItemKey: {},
          encryptedData: {
            v: 1,
            alg: "AES-256-GCM",
            nonce: "x",
            ciphertext: "y",
          },
        },
        { merge: true },
      ),
    );
  });
});

describe("firestore.rules sanity", () => {
  it("loaded a non-empty ruleset", () => {
    expect(readFileSync(rulesPath, "utf8").length).toBeGreaterThan(0);
  });
});
