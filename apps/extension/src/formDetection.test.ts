import { describe, expect, it } from "vitest";
import { classifyPasswordFields } from "./formDetection";

describe("classifyPasswordFields", () => {
  it("classifies a single current password as sign-in", () => {
    expect(
      classifyPasswordFields([
        { value: "secret", autocomplete: "current-password" },
      ]),
    ).toEqual({ kind: "signin", password: "secret" });
  });

  it("classifies matching new-password fields as sign-up", () => {
    expect(
      classifyPasswordFields([
        { value: "new-secret", autocomplete: "new-password" },
        { value: "new-secret", autocomplete: "new-password" },
      ]),
    ).toEqual({ kind: "signup", password: "new-secret" });
  });

  it("uses the new password for an explicit password-change form", () => {
    expect(
      classifyPasswordFields([
        { value: "old-secret", autocomplete: "current-password" },
        { value: "new-secret", autocomplete: "new-password" },
        { value: "new-secret", autocomplete: "new-password" },
      ]),
    ).toEqual({ kind: "password-change", password: "new-secret" });
  });

  it("rejects ambiguous or mismatched multi-password forms", () => {
    expect(
      classifyPasswordFields([
        { value: "one", autocomplete: "" },
        { value: "two", autocomplete: "" },
      ]),
    ).toBeNull();
    expect(
      classifyPasswordFields([
        { value: "one", autocomplete: "new-password" },
        { value: "two", autocomplete: "new-password" },
      ]),
    ).toBeNull();
  });

  it("ignores OTP, payment, and passkey secret fields", () => {
    for (const autocomplete of ["one-time-code", "cc-csc", "webauthn"]) {
      expect(
        classifyPasswordFields([{ value: "123456", autocomplete }]),
      ).toBeNull();
    }
  });

  it("rejects a password change with multiple current-password fields", () => {
    expect(
      classifyPasswordFields([
        { value: "old-one", autocomplete: "current-password" },
        { value: "old-two", autocomplete: "current-password" },
        { value: "new-one", autocomplete: "new-password" },
      ]),
    ).toBeNull();
  });
});
