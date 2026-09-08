import { describe, expect, it } from "vitest";
import { resolveFirebaseEmulatorConfig } from "./emulatorConfig";

describe("resolveFirebaseEmulatorConfig", () => {
  it("defaults to emulator disabled and localhost", () => {
    expect(resolveFirebaseEmulatorConfig({})).toEqual({
      useEmulator: false,
      host: "localhost",
      ports: { auth: 9099, firestore: 8080, storage: 9199, functions: 5001 },
    });
  });

  it("enables the emulator only when explicitly 'true'", () => {
    expect(
      resolveFirebaseEmulatorConfig({ useEmulator: "false" }).useEmulator,
    ).toBe(false);
    expect(
      resolveFirebaseEmulatorConfig({ useEmulator: "true" }).useEmulator,
    ).toBe(true);
  });

  it("respects a custom host", () => {
    expect(resolveFirebaseEmulatorConfig({ host: "10.0.2.2" }).host).toBe(
      "10.0.2.2",
    );
  });
});
