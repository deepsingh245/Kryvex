import { act, renderHook } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { useAutoLock } from "./useAutoLock";

const MINUTE = 60_000;

describe("useAutoLock", () => {
  let appStateListener: (state: AppStateStatus) => void;
  const remove = jest.fn();

  beforeEach(() => {
    jest.useFakeTimers();
    remove.mockReset();
    jest.spyOn(AppState, "addEventListener").mockImplementation((_, cb) => {
      appStateListener = cb;
      return { remove };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("locks with 'timeout' after the idle period", async () => {
    const onLock = jest.fn();
    await renderHook(() => useAutoLock(true, 5, onLock));
    await act(() => {
      jest.advanceTimersByTime(5 * MINUTE);
    });
    expect(onLock).toHaveBeenCalledWith("timeout");
  });

  it("reportActivity pushes the deadline back", async () => {
    const onLock = jest.fn();
    const { result } = await renderHook(() => useAutoLock(true, 5, onLock));
    await act(() => {
      jest.advanceTimersByTime(4 * MINUTE);
      result.current();
      jest.advanceTimersByTime(4 * MINUTE);
    });
    expect(onLock).not.toHaveBeenCalled();
  });

  it("does nothing while inactive (vault locked)", async () => {
    const onLock = jest.fn();
    await renderHook(() => useAutoLock(false, 1, onLock));
    await act(() => {
      jest.advanceTimersByTime(10 * MINUTE);
    });
    expect(onLock).not.toHaveBeenCalled();
  });

  it("locks with 'background' on resume after a long background", async () => {
    const onLock = jest.fn();
    await renderHook(() => useAutoLock(true, 5, onLock));
    await act(() => {
      appStateListener("background");
      // Timers don't fire while suspended — only wall clock moves.
      jest.setSystemTime(Date.now() + 6 * MINUTE);
      appStateListener("active");
    });
    expect(onLock).toHaveBeenCalledWith("background");
  });

  it("stays unlocked after a short background, restarting the timer", async () => {
    const onLock = jest.fn();
    await renderHook(() => useAutoLock(true, 5, onLock));
    await act(() => {
      appStateListener("background");
      jest.setSystemTime(Date.now() + MINUTE);
      appStateListener("active");
    });
    expect(onLock).not.toHaveBeenCalled();
    await act(() => {
      jest.advanceTimersByTime(5 * MINUTE);
    });
    expect(onLock).toHaveBeenCalledWith("timeout");
  });

  it("removes its AppState listener on unmount", async () => {
    const { unmount } = await renderHook(() => useAutoLock(true, 5, jest.fn()));
    await unmount();
    expect(remove).toHaveBeenCalled();
  });
});
