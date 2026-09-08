import { describe, expect, it } from "vitest";
import { CRYPTO_PACKAGE_PHASE, notYetImplemented } from "./index";

describe("@kryvex/crypto placeholder", () => {
  it("exposes a phase marker", () => {
    expect(CRYPTO_PACKAGE_PHASE).toBe("phase-1-scaffold");
  });

  it("throws a clear not-implemented error", () => {
    expect(() => notYetImplemented("argon2id")).toThrowError(/Phase 3/);
  });
});
