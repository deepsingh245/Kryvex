import { describe, expect, it } from "vitest";
import { SYNC_PACKAGE_PHASE, notYetImplemented } from "./index";

describe("@kryvex/sync placeholder", () => {
  it("resolves the @kryvex/types workspace dependency", () => {
    expect(SYNC_PACKAGE_PHASE).toEqual({
      phase: 1,
      label: "foundation-scaffold",
    });
  });

  it("throws a clear not-implemented error", () => {
    expect(() => notYetImplemented("resolveConflict")).toThrowError(/Phase 5/);
  });
});
