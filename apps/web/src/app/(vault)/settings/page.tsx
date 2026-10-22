"use client";

import { Fingerprint } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";
import { secureLogger } from "@kryvex/security";
import { Button, Dialog, Label, Select } from "@kryvex/ui";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { BackLink } from "@/components/layout/BackLink";
import { ThemeSelector } from "@/components/layout/ThemeToggle";
import { hasBiometricEnrollment, isBiometricSupported } from "@/lib/biometric";
import { useVault } from "@/providers/VaultProvider";

const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 60];
const CLIPBOARD_CLEAR_OPTIONS = [10, 30, 60, 120];

// Gating (SIGNED_OUT/AUTHENTICATED_LOCKED redirects) now lives once in
// ../layout.tsx, shared by every route in this group.
export default function SettingsPage() {
  const { state, settings, updateSettings, enableBiometric, disableBiometric } =
    useVault();
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
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricDialogOpen, setBiometricDialogOpen] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState("");
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const uid = state.status === "UNLOCKED" ? state.user.uid : null;

  useEffect(() => {
    let cancelled = false;
    void isBiometricSupported().then((ok) => {
      if (!cancelled) setBiometricSupported(ok);
    });
    if (uid) {
      void hasBiometricEnrollment(uid).then((enrolled) => {
        if (!cancelled) setBiometricEnrolled(enrolled);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [uid]);
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
        biometricUnlockEnabled: settings?.biometricUnlockEnabled ?? false,
      });
      setSaved(true);
    } catch (err) {
      secureLogger.error("Failed to save settings");
      setError(err instanceof Error ? err.message : "Failed to save settings.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnableBiometric(e: FormEvent) {
    e.preventDefault();
    setBiometricError(null);
    setBiometricBusy(true);
    try {
      await enableBiometric(biometricPassword);
      setBiometricEnrolled(true);
      setBiometricDialogOpen(false);
      setBiometricPassword("");
    } catch (err) {
      secureLogger.error("Failed to enable biometric unlock");
      setBiometricError(
        err instanceof Error
          ? err.message
          : "Couldn't enable biometric unlock.",
      );
    } finally {
      setBiometricBusy(false);
    }
  }

  async function handleDisableBiometric() {
    setBiometricError(null);
    setBiometricBusy(true);
    try {
      await disableBiometric();
      setBiometricEnrolled(false);
    } catch (err) {
      secureLogger.error("Failed to disable biometric unlock");
      setBiometricError(
        err instanceof Error
          ? err.message
          : "Couldn't disable biometric unlock.",
      );
    } finally {
      setBiometricBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col gap-6 px-4 py-10 sm:px-8 md:max-w-xl">
      <BackLink href="/" label="Back to vault" />
      <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
      <div className="flex flex-col gap-1.5">
        <Label>Appearance</Label>
        <ThemeSelector />
      </div>
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

        <div className="flex flex-col gap-2">
          <Label>Biometric unlock</Label>
          {!biometricSupported && !biometricEnrolled ? (
            <p className="text-sm text-text-secondary">
              Not available: this browser or device doesn&apos;t support secure
              biometric unlock. Your master password always works.
            </p>
          ) : biometricEnrolled ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                Enabled on this device. Signing out removes it.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={biometricBusy}
                onClick={() => void handleDisableBiometric()}
              >
                Disable
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-text-secondary">
                Unlock this device with your fingerprint or face instead of
                typing the master password.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setBiometricDialogOpen(true)}
              >
                <Fingerprint className="h-4 w-4" strokeWidth={1.75} />
                Enable
              </Button>
            </div>
          )}
          {biometricError && !biometricDialogOpen && (
            <p role="alert" className="text-sm text-destructive">
              {biometricError}
            </p>
          )}
        </div>

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
        </div>
      </form>

      <Dialog
        open={biometricDialogOpen}
        onOpenChange={setBiometricDialogOpen}
        title="Enable biometric unlock"
        description="Confirm your master password, then approve the biometric prompt."
      >
        <form
          onSubmit={(e) => void handleEnableBiometric(e)}
          className="flex flex-col gap-4"
        >
          <PasswordInput
            label="Master password"
            autoComplete="current-password"
            autoFocus
            required
            value={biometricPassword}
            onChange={(e) => setBiometricPassword(e.target.value)}
            error={biometricError ?? undefined}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setBiometricDialogOpen(false)}
              disabled={biometricBusy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={biometricBusy}>
              {biometricBusy ? "Enabling…" : "Enable"}
            </Button>
          </div>
        </form>
      </Dialog>
    </main>
  );
}
