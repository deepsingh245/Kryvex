import { describe, expect, it } from "vitest";
import { DEFAULT_GENERATOR_OPTIONS, generatePassword } from "./index";

describe("@kryvex/password-generator public API", () => {
  it("generatePassword is reachable from the package entry point", () => {
    expect(generatePassword(DEFAULT_GENERATOR_OPTIONS).length).toBe(
      DEFAULT_GENERATOR_OPTIONS.length,
    );
  });
});
