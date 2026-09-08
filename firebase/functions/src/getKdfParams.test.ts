import { describe, expect, it } from "vitest";
import { isValidEmail, normalizeEmail } from "./getKdfParams";

// Only the pure helpers are unit-tested here — the full onCall behavior
// (Admin SDK getUserByEmail/Firestore reads) needs the real emulator and is
// covered by tests/auth instead, so plain `pnpm test` doesn't require one.

describe("normalizeEmail", () => {
  it("trims and lowercases a string", () => {
    expect(normalizeEmail("  User@Example.com  ")).toBe("user@example.com");
  });

  it("returns an empty string for non-string input", () => {
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(123)).toBe("");
    expect(normalizeEmail(null)).toBe("");
  });
});

describe("isValidEmail", () => {
  it("accepts a string containing @", () => {
    expect(isValidEmail("a@b.com")).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("rejects a string without @", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
  });
});
