import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInactivityTimer } from "./autoLock";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createInactivityTimer", () => {
  it("calls onTimeout once the timeout elapses with no activity", () => {
    const onTimeout = vi.fn();
    createInactivityTimer(1000, onTimeout);
    vi.advanceTimersByTime(999);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("reset() extends the timeout instead of letting it fire", () => {
    const onTimeout = vi.fn();
    const timer = createInactivityTimer(1000, onTimeout);
    vi.advanceTimersByTime(800);
    timer.reset();
    vi.advanceTimersByTime(800);
    expect(onTimeout).not.toHaveBeenCalled();
    vi.advanceTimersByTime(200);
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it("cancel() stops onTimeout from ever firing", () => {
    const onTimeout = vi.fn();
    const timer = createInactivityTimer(1000, onTimeout);
    timer.cancel();
    vi.advanceTimersByTime(10_000);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("cancel() is safe to call more than once", () => {
    const timer = createInactivityTimer(1000, vi.fn());
    expect(() => {
      timer.cancel();
      timer.cancel();
    }).not.toThrow();
  });
});
