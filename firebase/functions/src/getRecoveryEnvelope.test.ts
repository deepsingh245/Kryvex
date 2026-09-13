import { describe, expect, it } from "vitest";
import { getRecoveryEnvelope } from "./getRecoveryEnvelope";

// No new pure logic here — normalizeEmail/isValidEmail are reused directly
// from getKdfParams.ts (already covered by getKdfParams.test.ts). The full
// onCall behavior (Admin SDK getUserByEmail/Firestore read) needs the real
// emulator and is covered by tests/auth instead. This just confirms the
// module builds and exports the callable.

describe("getRecoveryEnvelope", () => {
  it("is exported as a callable function", () => {
    expect(getRecoveryEnvelope).toBeDefined();
  });
});
