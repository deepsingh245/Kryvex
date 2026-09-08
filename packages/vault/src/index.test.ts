import { describe, expect, it } from "vitest";
import { VAULT_PACKAGE_PHASE, notYetImplemented } from "./index";

describe("@kryvex/vault placeholder", () => {
  it("resolves the @kryvex/types workspace dependency", () => {
    expect(VAULT_PACKAGE_PHASE).toEqual({
      phase: 1,
      label: "foundation-scaffold",
    });
  });

  it("throws a clear not-implemented error", () => {
    expect(() => notYetImplemented("createItem")).toThrowError(/Phase 4/);
  });
});
