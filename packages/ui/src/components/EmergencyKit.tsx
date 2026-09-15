"use client";

import { ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

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
    <Card className="p-6 sm:p-8">
      <CardHeader className="mb-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <ShieldCheck className="h-7 w-7 text-primary" strokeWidth={1.75} />
        </div>
        <CardTitle as="h1">Your Emergency Kit</CardTitle>
        <CardDescription>
          This Recovery Key is the only way to get back into your vault if
          you forget your master password. It will not be shown again.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="whitespace-pre-wrap break-all rounded-md border border-border-strong bg-surface-2 px-4 py-3 font-mono text-sm text-foreground">
          {recoveryKey}
        </pre>

        <Button
          type="button"
          variant="secondary"
          onClick={() => downloadKitFile(recoveryKey)}
        >
          Download as file
        </Button>

        <label className="flex items-start gap-2.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-strong accent-primary"
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
      </CardContent>
    </Card>
  );
}
