"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import { BooleanField, Button } from "@kryvex/ui";
import { useVault } from "@/providers/VaultProvider";

const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 60];
const CLIPBOARD_CLEAR_OPTIONS = [10, 30, 60, 120];

export default function SettingsPage() {
  const { state, settings, updateSettings } = useVault();
  const router = useRouter();
  // Lazy initial state, not a synchronous setState-in-effect: by the time
  // this page renders (state.status === "UNLOCKED", gated below), `settings`
  // is already populated by VaultProvider's unlock/signIn/signUp — see its
  // own comments on why that ordering holds.
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

  useEffect(() => {
    if (state.status === "SIGNED_OUT") router.replace("/sign-in");
    if (state.status === "AUTHENTICATED_LOCKED") router.replace("/unlock");
  }, [state.status, router]);

  if (state.status !== "UNLOCKED") {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

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
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <h1 className="text-xl font-semibold">Settings</h1>

        <label className="flex flex-col gap-1 text-sm">
          Lock after inactivity
          <select
            value={autoLockMinutes}
            onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
            className="rounded border px-3 py-2"
          >
            {AUTO_LOCK_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} {minutes === 1 ? "minute" : "minutes"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Clear clipboard after
          <select
            value={clipboardClearSeconds}
            onChange={(e) => setClipboardClearSeconds(Number(e.target.value))}
            className="rounded border px-3 py-2"
          >
            {CLIPBOARD_CLEAR_OPTIONS.map((seconds) => (
              <option key={seconds} value={seconds}>
                {seconds} seconds
              </option>
            ))}
          </select>
        </label>

        {/* Persisted but not yet consumed anywhere — no biometric unlock
            feature exists yet. Same documented gap as at sign-up. */}
        <BooleanField
          label="Biometric unlock (not yet available)"
          checked={biometricUnlockEnabled}
          onChange={setBiometricUnlockEnabled}
        />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {saved && !error && (
          <p role="status" className="text-sm text-green-700">
            Settings saved.
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving…" : "Save"}
          </Button>
          <Button onClick={() => router.push("/")} disabled={submitting}>
            Back to vault
          </Button>
        </div>
      </form>
    </main>
  );
}
