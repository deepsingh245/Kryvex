/**
 * Proves the emulator + storage.rules actually work together end-to-end
 * (docs/FIREBASE_SECURITY.md §7) — the storage.rules counterpart to
 * firestore.rules.test.ts. Only runs against the Firebase Emulator Suite
 * via `pnpm test:security`, never against production.
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
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rulesPath = path.join(__dirname, "..", "..", "firebase", "storage.rules");

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-kryvex",
    storage: { rules: readFileSync(rulesPath, "utf8") },
  });
});

afterEach(async () => {
  await testEnv.clearStorage();
});

afterAll(async () => {
  await testEnv.cleanup();
});

const SMALL_BLOB = new Uint8Array([1, 2, 3, 4]);

describe("storage.rules — users/{uid}/attachments/{attachmentId}", () => {
  it("denies an unauthenticated read", async () => {
    const unauthedStorage = testEnv.unauthenticatedContext().storage();
    await assertFails(
      getBytes(ref(unauthedStorage, "users/alice/attachments/att1")),
    );
  });

  it("denies an unauthenticated write", async () => {
    const unauthedStorage = testEnv.unauthenticatedContext().storage();
    await assertFails(
      uploadBytes(
        ref(unauthedStorage, "users/alice/attachments/att1"),
        SMALL_BLOB,
      ),
    );
  });

  it("denies user A writing to user B's attachments path", async () => {
    const bobStorage = testEnv.authenticatedContext("bob").storage();
    await assertFails(
      uploadBytes(ref(bobStorage, "users/alice/attachments/att1"), SMALL_BLOB),
    );
  });

  it("denies user A reading user B's attachment blob", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(
        ref(context.storage(), "users/alice/attachments/att1"),
        SMALL_BLOB,
      );
    });
    const bobStorage = testEnv.authenticatedContext("bob").storage();
    await assertFails(
      getBytes(ref(bobStorage, "users/alice/attachments/att1")),
    );
  });

  it("denies user A deleting user B's attachment blob", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await uploadBytes(
        ref(context.storage(), "users/alice/attachments/att1"),
        SMALL_BLOB,
      );
    });
    const bobStorage = testEnv.authenticatedContext("bob").storage();
    await assertFails(
      deleteObject(ref(bobStorage, "users/alice/attachments/att1")),
    );
  });

  it("allows the owner to write, read, and delete their own attachment blob", async () => {
    const aliceStorage = testEnv.authenticatedContext("alice").storage();
    const blobRef = ref(aliceStorage, "users/alice/attachments/att1");
    await assertSucceeds(uploadBytes(blobRef, SMALL_BLOB));
    await assertSucceeds(getBytes(blobRef));
    await assertSucceeds(deleteObject(blobRef));
  });

  it("denies an over-size upload", async () => {
    const aliceStorage = testEnv.authenticatedContext("alice").storage();
    const oversized = new Uint8Array(50 * 1024 * 1024 + 1);
    await assertFails(
      uploadBytes(
        ref(aliceStorage, "users/alice/attachments/att-big"),
        oversized,
      ),
    );
  });
});

describe("storage.rules sanity", () => {
  it("loaded a non-empty ruleset", () => {
    expect(readFileSync(rulesPath, "utf8").length).toBeGreaterThan(0);
  });
});
