import * as Clipboard from "expo-clipboard";
import { clipboard } from "@kryvex/security";

type ClipboardIO = clipboard.ClipboardIO;

/**
 * expo-clipboard adapter for @kryvex/security's copyWithAutoClear. Never
 * logs clipboard contents.
 *
 * Known limit: the clear runs on a JS timer, so if the OS suspends the app
 * before it fires (e.g. the user switches apps and never returns), the
 * value can stay on the clipboard until overwritten. lock() and signOut()
 * call clearCopiedSecret() as a second, best-effort chance.
 */
export const expoClipboardIO: ClipboardIO = {
  async write(text: string) {
    await Clipboard.setStringAsync(text);
  },
  async read() {
    return await Clipboard.getStringAsync();
  },
};

const SECONDS_TO_MS = 1000;

// Last value copied from the vault, kept only so clearCopiedSecret() can
// compare-before-clear. Held in memory only; dropped once cleared.
let lastCopied: string | null = null;

export async function copySecret(
  value: string,
  clearAfterSeconds: number,
  io: ClipboardIO = expoClipboardIO,
): Promise<void> {
  lastCopied = value;
  await clipboard.copyWithAutoClear(
    io,
    value,
    clearAfterSeconds * SECONDS_TO_MS,
  );
}

/** Clears the clipboard only if it still holds the last vault copy. */
export async function clearCopiedSecret(
  io: ClipboardIO = expoClipboardIO,
): Promise<void> {
  const value = lastCopied;
  lastCopied = null;
  if (value === null) return;
  try {
    if ((await io.read()) === value) await io.write("");
  } catch {
    // Clipboard unavailable — nothing safe to do.
  }
}
