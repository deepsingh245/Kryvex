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

  it("enables every item type (image/pdf/file since Phase 6)", () => {
    for (const type of ITEM_TYPES) {
      expect(ITEM_TYPE_ENABLED[type]).toBe(true);
    }
  });

  it("custom has no fixed fields (fully customFields-driven)", () => {
    expect(ITEM_TYPE_FIELD_CONFIG.custom).toEqual([]);
  });

  it("image/pdf/file have no fixed fields (attachmentId is an internal reference, not user-edited)", () => {
    expect(ITEM_TYPE_FIELD_CONFIG.image).toEqual([]);
    expect(ITEM_TYPE_FIELD_CONFIG.pdf).toEqual([]);
    expect(ITEM_TYPE_FIELD_CONFIG.file).toEqual([]);
  });
});
