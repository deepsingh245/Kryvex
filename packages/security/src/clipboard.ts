/**
 * Clipboard-clear-after-timeout — see build spec §20. Dependency-injected
 * (no `navigator` reference here) — same "platform I/O lives at the call
 * site" boundary @kryvex/vault's itemCrypto.ts/attachmentCrypto.ts already
 * follow, since navigator.clipboard doesn't exist on React Native (mobile
 * uses expo-clipboard instead) — this stays shared/testable either way.
 */

export interface ClipboardIO {
  write(text: string): Promise<void>;
  read(): Promise<string>;
}

const DEFAULT_CLEAR_DELAY_MS = 30_000;

/**
 * Writes `value` immediately, then after `delayMs` clears the clipboard —
 * but only if it still holds exactly what was written. Never blindly
 * clears: if the user copied something else in the meantime, that content
 * is left alone. A read failure (permission denied/unavailable) is a
 * silent no-op — same posture as the caller's own copy-failure handling.
 */
export async function copyWithAutoClear(
  clipboard: ClipboardIO,
  value: string,
  delayMs: number = DEFAULT_CLEAR_DELAY_MS,
): Promise<void> {
  await clipboard.write(value);
  setTimeout(() => {
    void (async () => {
      try {
        const current = await clipboard.read();
        if (current === value) {
          await clipboard.write("");
        }
      } catch {
        // Clipboard read denied/unavailable — nothing safe to do; the
        // value may remain on the clipboard until overwritten by the user.
      }
    })();
  }, delayMs);
}
