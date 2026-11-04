import { describe, expect, it } from "vitest";
import { isSessionExpired } from "./session";

describe("isSessionExpired", () => {
  it("expires at or before the current instant", () => {
    expect(isSessionExpired(100, 100)).toBe(true);
    expect(isSessionExpired(99, 100)).toBe(true);
    expect(isSessionExpired(101, 100)).toBe(false);
  });

  it("fails closed for invalid timestamps", () => {
    expect(isSessionExpired(Number.NaN, 100)).toBe(true);
    expect(isSessionExpired(Number.POSITIVE_INFINITY, 100)).toBe(true);
  });
});
