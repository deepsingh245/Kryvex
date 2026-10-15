"use client";

import { Fingerprint } from "lucide-react";

/**
 * Screen 03 biometric affordance. Only rendered by the unlock page when this
 * device actually has a biometric enrollment (see lib/biometric.ts) — never
 * shown as a placeholder, per CLAUDE.md's "never create fake security
 * indicators" rule.
 */
export function BiometricUnlockButton({
  onClick,
  busy = false,
}: {
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="flex flex-col items-center gap-2 rounded-md px-4 py-2 text-center transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong text-text-secondary">
        <Fingerprint className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="text-sm text-text-secondary">
        {busy ? "Waiting for biometric…" : "Unlock with biometrics"}
      </span>
    </button>
  );
}
