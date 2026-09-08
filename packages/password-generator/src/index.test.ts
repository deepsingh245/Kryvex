import { describe, expect, it } from "vitest";
import { PASSWORD_GENERATOR_PACKAGE_PHASE, notYetImplemented } from "./index";

describe("@kryvex/password-generator placeholder", () => {
  it("exposes a phase marker", () => {
    expect(PASSWORD_GENERATOR_PACKAGE_PHASE).toBe("phase-1-scaffold");
  });

  it("throws a clear not-implemented error", () => {
    expect(() => notYetImplemented("generate")).toThrowError(/Phase 4/);
  });
});
