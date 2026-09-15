import { describe, expect, it } from "vitest";
import { userProfileSettingsSchema } from "./userProfile";

function validSettings(overrides: Record<string, unknown> = {}) {
  return {
    autoLockMinutes: 5,
    clipboardClearSeconds: 30,
    biometricUnlockEnabled: false,
    ...overrides,
  };
}

describe("userProfileSettingsSchema", () => {
  it("accepts valid settings", () => {
    expect(userProfileSettingsSchema.safeParse(validSettings()).success).toBe(
      true,
    );
  });

  it("rejects a non-positive autoLockMinutes", () => {
    expect(
      userProfileSettingsSchema.safeParse(validSettings({ autoLockMinutes: 0 }))
        .success,
    ).toBe(false);
  });

  it("rejects a non-positive clipboardClearSeconds", () => {
    expect(
      userProfileSettingsSchema.safeParse(
        validSettings({ clipboardClearSeconds: -1 }),
      ).success,
    ).toBe(false);
  });

  it("rejects a non-boolean biometricUnlockEnabled", () => {
    expect(
      userProfileSettingsSchema.safeParse(
        validSettings({ biometricUnlockEnabled: "false" }),
      ).success,
    ).toBe(false);
  });

  it("rejects a missing field", () => {
    const settings = validSettings();
    delete (settings as { autoLockMinutes?: number }).autoLockMinutes;
    expect(userProfileSettingsSchema.safeParse(settings).success).toBe(false);
  });
});
