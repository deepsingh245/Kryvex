"use client";

import { useState } from "react";

export interface SecretFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean | undefined;
}

// No clipboard-clear-after-timeout here — that's Phase 7
// (packages/security/src/clipboard.ts, currently a stub). Flagged as a
// documented Phase 4 limitation, not silently shipped as if handled.
export function SecretField({
  label,
  value,
  onChange,
  readOnly,
  required,
}: SecretFieldProps) {
  const [revealed, setRevealed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard API can be unavailable/denied — no-op; no secret is
      // exposed either way.
    }
  }

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type={revealed ? "text" : "password"}
          value={value}
          required={required}
          readOnly={readOnly}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="button"
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
    </div>
  );
}
