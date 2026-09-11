"use client";

import { useState } from "react";
import {
  DEFAULT_GENERATOR_OPTIONS,
  generatePassword,
  type GeneratePasswordOptions,
} from "@kryvex/password-generator";
import { Button } from "./Button";

export interface PasswordGeneratorPanelProps {
  // Present when embedded (e.g. in the Login form's password SecretField);
  // omitted on the standalone /generator route.
  onUse?: (password: string) => void;
}

export function PasswordGeneratorPanel({ onUse }: PasswordGeneratorPanelProps) {
  const [options, setOptions] = useState<GeneratePasswordOptions>(
    DEFAULT_GENERATOR_OPTIONS,
  );
  const [password, setPassword] = useState(() =>
    generatePassword(DEFAULT_GENERATOR_OPTIONS),
  );

  function regenerate(next: GeneratePasswordOptions = options) {
    try {
      setPassword(generatePassword(next));
    } catch {
      // Every character set disabled — leave the last valid password
      // displayed rather than clearing it to an empty/invalid value.
    }
  }

  function update(patch: Partial<GeneratePasswordOptions>) {
    const next = { ...options, ...patch };
    setOptions(next);
    regenerate(next);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      // Clipboard API can be unavailable/denied — no-op.
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded border p-4">
      <div className="flex items-center gap-2">
        <code className="flex-1 truncate rounded bg-gray-100 px-2 py-1 text-sm">
          {password}
        </code>
        <Button onClick={() => regenerate()}>Regenerate</Button>
        <Button onClick={() => void handleCopy()}>Copy</Button>
        {onUse && (
          <Button variant="primary" onClick={() => onUse(password)}>
            Use
          </Button>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Length: {options.length}
        <input
          type="range"
          min={8}
          max={128}
          value={options.length}
          onChange={(e) => update({ length: Number(e.target.value) })}
        />
      </label>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={options.includeLowercase}
            onChange={(e) => update({ includeLowercase: e.target.checked })}
          />
          a-z
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={options.includeUppercase}
            onChange={(e) => update({ includeUppercase: e.target.checked })}
          />
          A-Z
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={options.includeDigits}
            onChange={(e) => update({ includeDigits: e.target.checked })}
          />
          0-9
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={options.includeSymbols}
            onChange={(e) => update({ includeSymbols: e.target.checked })}
          />
          !@#
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={options.excludeAmbiguous}
            onChange={(e) => update({ excludeAmbiguous: e.target.checked })}
          />
          Exclude ambiguous
        </label>
      </div>
    </div>
  );
}
