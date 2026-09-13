import { act, renderHook } from "@testing-library/react-native";
import NetInfo from "@react-native-community/netinfo";
import { useOnlineStatus } from "./useOnlineStatus";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn() },
}));

const mockedAddEventListener = jest.mocked(NetInfo.addEventListener);

describe("useOnlineStatus", () => {
  beforeEach(() => {
    mockedAddEventListener.mockReset();
  });

  it("starts online by default", async () => {
    mockedAddEventListener.mockReturnValue(jest.fn());
    const { result } = await renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it("updates to false when NetInfo reports disconnected", async () => {
    let listener: (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
    }) => void = () => {};
    mockedAddEventListener.mockImplementation((cb) => {
      listener = cb as typeof listener;
      return jest.fn();
    });

    const { result } = await renderHook(() => useOnlineStatus());

    await act(() => {
      listener({ isConnected: false, isInternetReachable: false });
    });
    expect(result.current).toBe(false);
  });

  it("treats an unknown (null) reachability as online when connected", async () => {
    let listener: (state: {
      isConnected: boolean | null;
      isInternetReachable: boolean | null;
    }) => void = () => {};
    mockedAddEventListener.mockImplementation((cb) => {
      listener = cb as typeof listener;
      return jest.fn();
    });

    const { result } = await renderHook(() => useOnlineStatus());

    await act(() => {
      listener({ isConnected: true, isInternetReachable: null });
    });
    expect(result.current).toBe(true);
  });
});
