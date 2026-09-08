import { describe, expect, it } from "vitest";
import { KRYVEX_BRAND_COLOR } from "./index";

describe("@kryvex/ui placeholder", () => {
  it("exposes a design token", () => {
    expect(KRYVEX_BRAND_COLOR).toBe("#1f2937");
  });
});
