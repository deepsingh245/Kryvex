"use client";

import { Check, Copy, RotateCw } from "lucide-react";
import { useState } from "react";
import {
  DEFAULT_GENERATOR_OPTIONS,
  generatePassword,
  type GeneratePasswordOptions,
} from "@kryvex/password-generator";
import { clipboard as clipboardModule } from "@kryvex/security";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

export interface PasswordGeneratorPanelProps {
  // Present when embedded (e.g. in the Login form's password SecretField);
  // omitted on the standalone /generator route.
  onUse?: (password: string) => void;
  clipboardClearSeconds?: number | undefined;
}

const browserClipboard: clipboardModule.ClipboardIO = {
  write: (text) => navigator.clipboard.writeText(text),
  read: () => navigator.clipboard.readText(),
};

const DEFAULT_CLIPBOARD_CLEAR_SECONDS = 30;
const COPY_ANNOUNCEMENT_MS = 2000;

const CHARSET_TOGGLES: {
  key: keyof Pick<
    GeneratePasswordOptions,
    "includeLowercase" | "includeUppercase" | "includeDigits" | "includeSymbols"
  >;
  label: string;
}[] = [
  { key: "includeLowercase", label: "a-z" },
  { key: "includeUppercase", label: "A-Z" },
  { key: "includeDigits", label: "0-9" },
  { key: "includeSymbols", label: "!@#" },
];

export function PasswordGeneratorPanel({
  onUse,
  clipboardClearSeconds = DEFAULT_CLIPBOARD_CLEAR_SECONDS,
}: PasswordGeneratorPanelProps) {
  const [options, setOptions] = useState<GeneratePasswordOptions>(
    DEFAULT_GENERATOR_OPTIONS,
  );
  const [password, setPassword] = useState(() =>
    generatePassword(DEFAULT_GENERATOR_OPTIONS),
  );
  const [error, setError] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);

  function regenerate(next: GeneratePasswordOptions = options) {
    try {
      setPassword(generatePassword(next));
      setError(null);
    } catch {
      // Every character set disabled — leave the last valid password
      // displayed rather than clearing it to an empty/invalid value, but
      // tell the user why nothing changed.
      setError("Enable at least one character set to generate a password.");
    }
  }

  function update(patch: Partial<GeneratePasswordOptions>) {
    const next = { ...options, ...patch };
    setOptions(next);
    regenerate(next);
  }

  async function handleCopy() {
    try {
      await clipboardModule.copyWithAutoClear(
        browserClipboard,
        password,
        clipboardClearSeconds * 1000,
      );
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), COPY_ANNOUNCEMENT_MS);
    } catch {
      setError("Unable to copy to the clipboard.");
    }
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="flex-1 truncate rounded-md border border-border bg-surface-2 px-3 py-2.5 font-mono text-sm text-foreground">
          {password}
        </code>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Regenerate"
          onClick={() => regenerate()}
        >
          <RotateCw className="h-4 w-4" strokeWidth={1.75} />
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Copy"
          onClick={() => void handleCopy()}
        >
          {justCopied ? (
            <Check className="h-4 w-4 text-success" strokeWidth={2} />
          ) : (
            <Copy className="h-4 w-4" strokeWidth={1.75} />
          )}
        </Button>
        {onUse && (
          <Button
            type="button"
            variant="primary"
            onClick={() => onUse(password)}
          >
            Use
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <label className="flex flex-col gap-1.5 text-sm text-foreground">
        Length: {options.length}
        <input
          type="range"
          min={8}
          max={128}
          value={options.length}
          onChange={(e) => update({ length: Number(e.target.value) })}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-primary"
        />
      </label>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-foreground">
        {CHARSET_TOGGLES.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={options[key]}
              onChange={(e) => update({ [key]: e.target.checked })}
              className="h-4 w-4 rounded border-border-strong accent-primary"
            />
            {label}
          </label>
        ))}
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={options.excludeAmbiguous}
            onChange={(e) => update({ excludeAmbiguous: e.target.checked })}
            className="h-4 w-4 rounded border-border-strong accent-primary"
          />
          Exclude ambiguous
        </label>
      </div>
    </Card>
  );
}
