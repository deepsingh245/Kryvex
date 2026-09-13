import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Connectivity detection for the sync engine's retry-on-reconnect flow —
 * mirrors apps/web/src/hooks/useOnlineStatus.ts, using
 * @react-native-community/netinfo instead of navigator.onLine (RN has no
 * such browser API).
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      // isInternetReachable can be null (undetermined) — only treat an
      // explicit false as offline, so an unknown state doesn't block retries.
      setIsOnline(
        Boolean(state.isConnected) && state.isInternetReachable !== false,
      );
    });
  }, []);

  return isOnline;
}
