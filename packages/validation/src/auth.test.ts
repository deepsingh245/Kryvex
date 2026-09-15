import { describe, expect, it } from "vitest";
import {
  emailSchema,
  masterPasswordSchema,
  signInFormSchema,
  signUpFormSchema,
} from "./auth";

describe("emailSchema", () => {
  it("accepts a valid email and normalizes case/whitespace", () => {
    expect(emailSchema.parse(" User@Example.com ")).toBe("user@example.com");
  });

  it("rejects an invalid email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("masterPasswordSchema", () => {
  it("rejects a password shorter than 12 characters", () => {
    expect(masterPasswordSchema.safeParse("short").success).toBe(false);
  });

  it("accepts a 12+ character password meeting all requirements", () => {
    expect(
      masterPasswordSchema.safeParse("Correct-Horse9-Battery").success,
    ).toBe(true);
  });

  it("rejects a 12+ character password missing an uppercase letter", () => {
    expect(
      masterPasswordSchema.safeParse("correct-horse9-battery").success,
    ).toBe(false);
  });

  it("rejects a 12+ character password missing a lowercase letter", () => {
    expect(
      masterPasswordSchema.safeParse("CORRECT-HORSE9-BATTERY").success,
    ).toBe(false);
  });

  it("rejects a 12+ character password missing a number", () => {
    expect(
      masterPasswordSchema.safeParse("Correct-Horse-Battery").success,
    ).toBe(false);
  });

  it("rejects a 12+ character password missing a special character", () => {
    expect(
      masterPasswordSchema.safeParse("Correct9Horse9Battery").success,
    ).toBe(false);
  });
});

describe("signUpFormSchema", () => {
  it("accepts matching passwords", () => {
    const result = signUpFormSchema.safeParse({
      email: "a@b.com",
      masterPassword: "Correct-Horse9-Battery",
      confirmMasterPassword: "Correct-Horse9-Battery",
    });
    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = signUpFormSchema.safeParse({
      email: "a@b.com",
      masterPassword: "Correct-Horse9-Battery",
      confirmMasterPassword: "different password entirely",
    });
    expect(result.success).toBe(false);
  });
});

describe("signInFormSchema", () => {
  it("does not enforce a minimum length on the master password", () => {
    const result = signInFormSchema.safeParse({
      email: "a@b.com",
      masterPassword: "x",
    });
    expect(result.success).toBe(true);
  });

  it("still requires a non-empty master password", () => {
    const result = signInFormSchema.safeParse({
      email: "a@b.com",
      masterPassword: "",
    });
    expect(result.success).toBe(false);
  });
});
