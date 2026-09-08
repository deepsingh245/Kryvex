import { describe, expect, it } from "vitest";
import { nonEmptyStringSchema } from "./index";

describe("@kryvex/validation placeholder", () => {
  it("accepts a non-empty string", () => {
    expect(nonEmptyStringSchema.safeParse("hello").success).toBe(true);
  });

  it("rejects an empty string", () => {
    expect(nonEmptyStringSchema.safeParse("").success).toBe(false);
  });

  it("rejects a non-string", () => {
    expect(nonEmptyStringSchema.safeParse(123).success).toBe(false);
  });
});
