import { ITEM_TYPES } from "@kryvex/types";
import { describe, expect, it } from "vitest";
import {
  ITEM_TYPE_ENABLED,
  ITEM_TYPE_FIELD_CONFIG,
  ITEM_TYPE_ICON_NAMES,
  ITEM_TYPE_LABELS,
} from "./fieldConfig";

describe("field config completeness", () => {
  it("has an entry in every record for all 11 ItemTypes", () => {
    for (const type of ITEM_TYPES) {
      expect(ITEM_TYPE_LABELS[type]).toBeTruthy();
      expect(ITEM_TYPE_ICON_NAMES[type]).toBeTruthy();
      expect(ITEM_TYPE_ENABLED[type]).toBeDefined();
      expect(ITEM_TYPE_FIELD_CONFIG[type]).toBeDefined();
    }
  });

  it("disables image/pdf/file until Phase 6 attachment storage exists", () => {
    expect(ITEM_TYPE_ENABLED.image).toBe(false);
    expect(ITEM_TYPE_ENABLED.pdf).toBe(false);
    expect(ITEM_TYPE_ENABLED.file).toBe(false);
  });

  it("enables every other item type", () => {
    for (const type of ITEM_TYPES) {
      if (type === "image" || type === "pdf" || type === "file") continue;
      expect(ITEM_TYPE_ENABLED[type]).toBe(true);
    }
  });

  it("custom has no fixed fields (fully customFields-driven)", () => {
    expect(ITEM_TYPE_FIELD_CONFIG.custom).toEqual([]);
  });
});
