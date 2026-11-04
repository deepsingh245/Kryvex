import { describe, expect, it } from "vitest";
import { extensionRequestSchema } from "./messages";

describe("extensionRequestSchema", () => {
  it("accepts a bounded credential capture message", () => {
    expect(
      extensionRequestSchema.safeParse({
        type: "CAPTURE_CREDENTIAL",
        url: "https://example.com/login",
        username: "person@example.com",
        password: "not-logged-or-persisted",
        kind: "signin",
      }).success,
    ).toBe(true);
  });

  it("rejects unknown message types and malformed URLs", () => {
    expect(
      extensionRequestSchema.safeParse({ type: "READ_ALL_KEYS" }).success,
    ).toBe(false);
    expect(
      extensionRequestSchema.safeParse({
        type: "LIST_MATCHES",
        url: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });

  it("bounds secrets so hostile pages cannot exhaust the worker", () => {
    expect(
      extensionRequestSchema.safeParse({
        type: "UNLOCK",
        masterPassword: "x".repeat(4097),
      }).success,
    ).toBe(false);
  });
});
