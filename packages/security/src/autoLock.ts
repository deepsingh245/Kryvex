/**
 * Pure inactivity timer — see docs/ARCHITECTURE.md §2 (lock state machine)
 * and build spec §19 (lock on background/inactivity/explicit lock/session
 * expiry). No DOM/platform dependency (plain setTimeout) so this stays
 * shared across apps/web and apps/mobile — the caller wires real activity
 * signals (DOM events on web, AppState on mobile) to reset()/cancel().
 */

export interface InactivityTimerHandle {
  reset(): void;
  cancel(): void;
}

/** Starts immediately; call reset() on every activity signal, cancel() on unmount/lock. */
export function createInactivityTimer(
  timeoutMs: number,
  onTimeout: () => void,
): InactivityTimerHandle {
  let timer: ReturnType<typeof setTimeout> | undefined;

  function reset(): void {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onTimeout, timeoutMs);
  }

  function cancel(): void {
    if (timer) clearTimeout(timer);
    timer = undefined;
  }

  reset();
  return { reset, cancel };
}
