"use client";

import { Fingerprint } from "lucide-react";
import { toast } from "sonner";

/**
 * Screen 03 biometric affordance. There is no biometric-unlock
 * implementation yet (the Settings page's own toggle is a documented
 * placeholder) — clicking is honest about that instead of pretending to
 * unlock, per CLAUDE.md's "never create fake security indicators" rule.
 */
export function BiometricUnlockButton() {
  return (
    <button
      type="button"
      onClick={() =>
        toast.info("Biometric unlock isn't available yet.", {
          description: "You can turn it on from Settings once it ships.",
        })
      }
      className="flex flex-col items-center gap-2 rounded-md px-4 py-2 text-center transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border-strong text-text-secondary">
        <Fingerprint className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="text-sm text-text-secondary">
        Use Face ID / Touch ID
        <br />
        for faster access
      </span>
    </button>
  );
}
