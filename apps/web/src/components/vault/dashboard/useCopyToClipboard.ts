"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clipboard as clipboardModule } from "@kryvex/security";

const DEFAULT_CLEAR_SECONDS = 30;
const COPIED_FLASH_MS = 1500;

const browserClipboard: clipboardModule.ClipboardIO = {
  write: (text) => navigator.clipboard.writeText(text),
  read: () => navigator.clipboard.readText(),
};

/**
 * Copies via @kryvex/security's copyWithAutoClear (same path SecretField
 * uses), so every copied credential is wiped from the clipboard after the
 * user's configured delay. `copiedKey` flashes briefly for UI feedback.
 */
export function useCopyToClipboard(clearSeconds?: number) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (key: string, text: string) => {
      try {
        await clipboardModule.copyWithAutoClear(
          browserClipboard,
          text,
          (clearSeconds ?? DEFAULT_CLEAR_SECONDS) * 1000,
        );
        setCopiedKey(key);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopiedKey(null), COPIED_FLASH_MS);
      } catch {
        // Clipboard unavailable/denied — nothing was exposed either way.
      }
    },
    [clearSeconds],
  );

  return { copy, copiedKey };
}
