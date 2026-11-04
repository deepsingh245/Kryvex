import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { autoLock } from "@kryvex/security";

const MINUTES_TO_MS = 60_000;

/**
 * Auto-lock while `active` (i.e. UNLOCKED). Foreground: an idle timer reset
 * by the returned reportActivity (wired to every touch at the root).
 * Background: deliberately NOT an immediate lock like web's tab-hidden —
 * copying a password into another app is the core mobile flow. The same
 * timeout applies instead, measured by wall clock on resume, since JS
 * timers don't run reliably while the app is suspended. The app-switcher
 * privacy cover (PrivacyGuard) hides content meanwhile.
 */
export function useAutoLock(
  active: boolean,
  autoLockMinutes: number,
  onLock: (reason: "timeout" | "background") => void,
): () => void {
  const timerRef = useRef<autoLock.InactivityTimerHandle | null>(null);
  const onLockRef = useRef(onLock);
  useEffect(() => {
    onLockRef.current = onLock;
  });

  useEffect(() => {
    if (!active) return;
    const timeoutMs = autoLockMinutes * MINUTES_TO_MS;
    const timer = autoLock.createInactivityTimer(timeoutMs, () => {
      onLockRef.current("timeout");
    });
    timerRef.current = timer;
    let backgroundedAt: number | null = null;

    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "background") {
        backgroundedAt ??= Date.now();
        timer.cancel();
      } else if (next === "active" && backgroundedAt !== null) {
        const elapsed = Date.now() - backgroundedAt;
        backgroundedAt = null;
        if (elapsed >= timeoutMs) {
          onLockRef.current("background");
        } else {
          timer.reset();
        }
      }
    });

    return () => {
      timer.cancel();
      timerRef.current = null;
      subscription.remove();
    };
  }, [active, autoLockMinutes]);

  return () => timerRef.current?.reset();
}
