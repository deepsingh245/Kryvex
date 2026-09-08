import { describe, expect, it } from "vitest";
import { notYetImplemented } from "./index";

describe("@kryvex/crypto remaining placeholder", () => {
  it("throws a clear not-implemented error for Phase 3 features", () => {
    expect(() => notYetImplemented("AES-256-GCM item encryption")).toThrowError(
      /Phase 3/,
    );
  });
});
