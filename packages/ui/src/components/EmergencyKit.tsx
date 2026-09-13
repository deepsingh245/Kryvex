"use client";

import { useState } from "react";
import { Button } from "./Button";

export interface EmergencyKitProps {
  recoveryKey: string;
  onContinue: () => void;
}

const ACKNOWLEDGMENT_TEXT =
  "If you lose both your master password and your Emergency Kit, Kryvex cannot recover your vault. There is no backdoor — that's what makes your data private.";

function downloadKitFile(recoveryKey: string): void {
  const contents = [
    "Kryvex Emergency Kit",
    "",
    "This is your Recovery Key. It does not contain your master password,",
    "item content, or anything else — only this key.",
    "",
    recoveryKey,
    "",
    "Keep this somewhere safe (e.g. a password manager, a safe, or printed",
    "and stored securely). Anyone who has this key AND access to your email",
    "can recover your vault if you forget your master password.",
  ].join("\n");
  const url = URL.createObjectURL(new Blob([contents], { type: "text/plain" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "kryvex-emergency-kit.txt";
  anchor.click();
  URL.revokeObjectURL(url);
}

/**
 * Shown exactly once at sign-up, and again after a successful recovery
 * (the old kit is spent — see docs/RECOVERY.md §2-3). No QR code this pass
 * — text + download only (explicit MVP scope trim, not silently dropped).
 */
export function EmergencyKit({ recoveryKey, onContinue }: EmergencyKitProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Your Emergency Kit</h2>
      <p className="text-sm text-gray-500">
        This Recovery Key is the only way to get back into your vault if you
        forget your master password. It will not be shown again.
      </p>

      <pre className="whitespace-pre-wrap break-all rounded border bg-gray-50 px-4 py-3 font-mono text-sm">
        {recoveryKey}
      </pre>

      <Button type="button" onClick={() => downloadKitFile(recoveryKey)}>
        Download as file
      </Button>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-1"
        />
        <span>{ACKNOWLEDGMENT_TEXT}</span>
      </label>

      <Button
        type="button"
        variant="primary"
        disabled={!acknowledged}
        onClick={onContinue}
      >
        Continue
      </Button>
    </div>
  );
}
