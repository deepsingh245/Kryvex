"use client";

import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { useId, useState } from "react";
import { clipboard as clipboardModule } from "@kryvex/security";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          type={revealed ? "text" : "password"}
          value={value}
          required={required}
          readOnly={readOnly}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="pr-20 font-mono text-sm"
        />
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            type="button"
            aria-pressed={revealed}
            aria-label={revealed ? "Hide" : "Reveal"}
            onClick={() => setRevealed((r) => !r)}
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {revealed ? (
              <EyeOff className="h-[18px] w-[18px]" strokeWidth={1.75} />
            ) : (
              <Eye className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
          </button>
          <button
            type="button"
            aria-label="Copy"
            onClick={() => void handleCopy()}
            className="mr-1 flex h-10 w-10 items-center justify-center rounded-md text-text-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {justCopied ? (
              <Check className="h-[18px] w-[18px] text-success" strokeWidth={2} />
            ) : (
              <Copy className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
          </button>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {justCopied ? "Copied" : ""}
      </span>
    </div>
  );
}
