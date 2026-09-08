import { describe, expect, it } from "vitest";
import { PHASE_1_MARKER, type Brand } from "./index";

describe("@kryvex/types placeholder", () => {
  it("exposes a phase marker", () => {
    expect(PHASE_1_MARKER).toEqual({ phase: 1, label: "foundation-scaffold" });
  });

  it("Brand<T, B> compiles as a nominal type over a primitive", () => {
    type ItemId = Brand<string, "ItemId">;
    const id = "abc-123" as ItemId;
    expect(typeof id).toBe("string");
  });
});
