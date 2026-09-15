"use client";

import { useId, useState } from "react";
import { clipboard as clipboardModule } from "@kryvex/security";

export interface SecretFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean | undefined;
  // Seconds before a copied value is cleared from the clipboard — sourced
  // from the user's settings (see apps/web/src/app/settings). Defaults to
  // the same 30s @kryvex/security/clipboard.ts itself defaults to.
  clipboardClearSeconds?: number | undefined;
}

const browserClipboard: clipboardModule.ClipboardIO = {
  write: (text) => navigator.clipboard.writeText(text),
  read: () => navigator.clipboard.readText(),
};

const DEFAULT_CLIPBOARD_CLEAR_SECONDS = 30;
// How long the "Copied" live-region announcement stays mounted — long
// enough for a screen reader to announce it, short enough to not linger.
const COPY_ANNOUNCEMENT_MS = 2000;

export function SecretField({
  label,
  value,
  onChange,
  readOnly,
  required,
  clipboardClearSeconds = DEFAULT_CLIPBOARD_CLEAR_SECONDS,
}: SecretFieldProps) {
  const [revealed, setRevealed] = useState(false);
  const [justCopied, setJustCopied] = useState(false);
  const inputId = useId();

  async function handleCopy() {
    try {
      await clipboardModule.copyWithAutoClear(
        browserClipboard,
        value,
        clipboardClearSeconds * 1000,
      );
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), COPY_ANNOUNCEMENT_MS);
    } catch {
      // Clipboard API can be unavailable/denied — no-op; no secret is
      // exposed either way.
    }
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={inputId}>{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type={revealed ? "text" : "password"}
          value={value}
          required={required}
          readOnly={readOnly}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="button"
          aria-pressed={revealed}
          onClick={() => setRevealed((r) => !r)}
          className="rounded border px-2 py-1 text-xs"
        >
          {revealed ? "Hide" : "Reveal"}
        </button>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="rounded border px-2 py-1 text-xs"
        >
          Copy
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {justCopied ? "Copied" : ""}
      </span>
    </div>
  );
}
