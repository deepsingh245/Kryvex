"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import { BooleanField, Button, Label, Select } from "@kryvex/ui";
import { useVault } from "@/providers/VaultProvider";

const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 60];
const CLIPBOARD_CLEAR_OPTIONS = [10, 30, 60, 120];

// Gating (SIGNED_OUT/AUTHENTICATED_LOCKED redirects) now lives once in
// ../layout.tsx, shared by every route in this group.
export default function SettingsPage() {
  const { settings, updateSettings } = useVault();
  const router = useRouter();
  const autoLockId = useId();
  const clipboardId = useId();
  // Lazy initial state, not a synchronous setState-in-effect: by the time
  // this page renders (only reachable once ../layout.tsx confirms
  // UNLOCKED), `settings` is already populated by VaultProvider's
  // unlock/signIn/signUp — see its own comments on why that ordering holds.
  const [autoLockMinutes, setAutoLockMinutes] = useState(
    () => settings?.autoLockMinutes ?? 5,
  );
  const [clipboardClearSeconds, setClipboardClearSeconds] = useState(
    () => settings?.clipboardClearSeconds ?? 30,
  );
  const [biometricUnlockEnabled, setBiometricUnlockEnabled] = useState(
    () => settings?.biometricUnlockEnabled ?? false,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);
    try {
      await updateSettings({
        autoLockMinutes,
        clipboardClearSeconds,
        biometricUnlockEnabled,
      });
      setSaved(true);
    } catch (err) {
      secureLogger.error("Failed to save settings");
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10 sm:px-8">
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={autoLockId}>Lock after inactivity</Label>
          <Select
            id={autoLockId}
            value={autoLockMinutes}
            onChange={(value) => setAutoLockMinutes(Number(value))}
          >
            {AUTO_LOCK_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} {minutes === 1 ? "minute" : "minutes"}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={clipboardId}>Clear clipboard after</Label>
          <Select
            id={clipboardId}
            value={clipboardClearSeconds}
            onChange={(value) => setClipboardClearSeconds(Number(value))}
          >
            {CLIPBOARD_CLEAR_OPTIONS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds} seconds
              </option>
            ))}
          </Select>
        </div>

        {/* Persisted but not yet consumed anywhere — no biometric unlock
            feature exists yet. Same documented gap as at sign-up. */}
        <BooleanField
          label="Biometric unlock (not yet available)"
          checked={biometricUnlockEnabled}
          onChange={setBiometricUnlockEnabled}
        />

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" className="text-sm text-success">
            Settings saved.
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/")}
            disabled={submitting}
          >
            Back to vault
          </Button>
        </div>
      </form>
    </main>
  );
}
