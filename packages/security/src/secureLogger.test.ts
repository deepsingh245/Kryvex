import { afterEach, describe, expect, it, vi } from "vitest";
import { secureLogger } from "./secureLogger";

describe("secureLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("passes plain messages through to console.info", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    secureLogger.info("hello");
    expect(spy).toHaveBeenCalledWith("hello");
  });

  it("redacts sensitive keys before reaching console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    secureLogger.error("decrypt failed", {
      itemId: "abc",
      password: "hunter2",
    });
    expect(spy).toHaveBeenCalledWith("decrypt failed", {
      itemId: "abc",
      password: "[REDACTED]",
    });
  });

  it("redacts nested sensitive keys", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    secureLogger.warn("sync conflict", {
      item: { title: "GitHub", masterKey: "x" },
    });
    expect(spy).toHaveBeenCalledWith("sync conflict", {
      item: { title: "GitHub", masterKey: "[REDACTED]" },
    });
  });
});
