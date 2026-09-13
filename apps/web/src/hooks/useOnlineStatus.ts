"use client";

import { useEffect, useState } from "react";

/**
 * Connectivity detection for the sync engine's retry-on-reconnect flow —
 * see docs/SYNC_ENGINE.md's offline queue. Plain browser APIs, no new
 * dependency needed on web (the mobile equivalent needs
 * `@react-native-community/netinfo` — see PLAN.md's Phase 5b note).
 */
export function useOnlineStatus(): boolean {
  // navigator.onLine is unavailable during SSR; Next.js hydrates client-side
  // for "use client" components before this matters for real connectivity
  // decisions, so a true default is a safe, non-flashing starting guess.
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
