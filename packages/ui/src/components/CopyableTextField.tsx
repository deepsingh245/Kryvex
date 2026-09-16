"use client";

import { Check, Copy } from "lucide-react";
import { useId, useState } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface CopyableTextFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean | undefined;
}

// How long the "Copied" live-region announcement stays mounted — matches
// SecretField's own constant.
const COPY_ANNOUNCEMENT_MS = 2000;

/**
 * A visible-by-default text field with a Copy button — for values that are
 * useful to copy but aren't secret (e.g. an email address), unlike
 * SecretField which hides its value until revealed. Deliberately a plain
 * clipboard write with no auto-clear timeout: auto-clearing is a
 * password-specific concern (see @kryvex/security/clipboard.ts), not
 * appropriate for a value the user likely wants to paste more than once.
 */
export function CopyableTextField({
  label,
  value,
  onChange,
  readOnly,
  required,
}: CopyableTextFieldProps) {
  const [justCopied, setJustCopied] = useState(false);
  const inputId = useId();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), COPY_ANNOUNCEMENT_MS);
    } catch {
      // Clipboard API can be unavailable/denied — no-op.
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          type="text"
          value={value}
          required={required}
          readOnly={readOnly}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="pr-11"
        />
        <button
          type="button"
          aria-label="Copy"
          onClick={() => void handleCopy()}
          className="absolute inset-y-0 right-0 mr-1 flex h-10 w-10 items-center justify-center rounded-md text-text-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {justCopied ? (
            <Check className="h-[18px] w-[18px] text-success" strokeWidth={2} />
          ) : (
            <Copy className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {justCopied ? "Copied" : ""}
      </span>
    </div>
  );
}
