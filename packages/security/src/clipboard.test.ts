import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyWithAutoClear, type ClipboardIO } from "./clipboard";

function fakeClipboard(initial = ""): ClipboardIO & { value: string } {
  return {
    value: initial,
    async write(text: string) {
      this.value = text;
    },
    async read() {
      return this.value;
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("copyWithAutoClear", () => {
  it("writes the value immediately", async () => {
    const clipboard = fakeClipboard();
    await copyWithAutoClear(clipboard, "hunter2", 1000);
    expect(clipboard.value).toBe("hunter2");
  });

  it("clears the clipboard after the delay if untouched", async () => {
    const clipboard = fakeClipboard();
    await copyWithAutoClear(clipboard, "hunter2", 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(clipboard.value).toBe("");
  });

  it("does not clear if the clipboard content changed in the meantime", async () => {
    const clipboard = fakeClipboard();
    await copyWithAutoClear(clipboard, "hunter2", 1000);
    clipboard.value = "something else the user copied";
    await vi.advanceTimersByTimeAsync(1000);
    expect(clipboard.value).toBe("something else the user copied");
  });

  it("does not throw and leaves state alone when read() rejects", async () => {
    const clipboard = fakeClipboard("hunter2");
    clipboard.read = async () => {
      throw new Error("permission denied");
    };
    await copyWithAutoClear(clipboard, "hunter2", 1000);
    await expect(vi.advanceTimersByTimeAsync(1000)).resolves.not.toThrow();
    expect(clipboard.value).toBe("hunter2");
  });

  it("uses a default delay when none is given", async () => {
    const clipboard = fakeClipboard();
    await copyWithAutoClear(clipboard, "hunter2");
    await vi.advanceTimersByTimeAsync(29_999);
    expect(clipboard.value).toBe("hunter2");
    await vi.advanceTimersByTimeAsync(1);
    expect(clipboard.value).toBe("");
  });
});
