import { describe, expect, it } from "vitest";
import { createInMemoryLocalCache } from "./index";

describe("@kryvex/storage placeholder (temporary in-memory cache)", () => {
  it("round-trips a set/get", () => {
    const cache = createInMemoryLocalCache();
    cache.set("k", "v");
    expect(cache.get("k")).toBe("v");
  });

  it("deletes a key", () => {
    const cache = createInMemoryLocalCache();
    cache.set("k", "v");
    cache.delete("k");
    expect(cache.get("k")).toBeUndefined();
  });

  it("clears all keys", () => {
    const cache = createInMemoryLocalCache();
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBeUndefined();
  });
});
