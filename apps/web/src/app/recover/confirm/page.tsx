"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { initializeKryvexFirebase, verifyRecoveryCode } from "@kryvex/firebase";
import { masterPasswordSchema } from "@kryvex/validation";
import { secureLogger } from "@kryvex/security";
import { Button, EmergencyKit, Input, Label } from "@kryvex/ui";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import {
  webFirebaseConfig,
  webFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";
import { useVault } from "@/providers/VaultProvider";

function getServices() {
  return initializeKryvexFirebase(webFirebaseConfig, webFirebaseEmulatorEnv);
}

// useSearchParams() requires a Suspense boundary during static prerendering
// — the actual logic lives in RecoverConfirmInner below.
export default function RecoverConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
          <p className="text-sm text-text-secondary">Loading…</p>
        </main>
      }
    >
      <RecoverConfirmInner />
    </Suspense>
  );
}

function RecoverConfirmInner() {
  const { recoverVault } = useVault();
  const router = useRouter();
  const searchParams = useSearchParams();
  const oobCode = searchParams.get("oobCode") ?? "";

  // Lazy initial state (not a synchronous setState-in-effect) — with no
  // oobCode at all, there's nothing to check, so start already "done".
  const [checkingCode, setCheckingCode] = useState(() => Boolean(oobCode));
  const [codeValid, setCodeValid] = useState(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);

  useEffect(() => {
    if (!oobCode) return;
    let cancelled = false;
    void (async () => {
      try {
        await verifyRecoveryCode(getServices().auth, oobCode);
        if (!cancelled) setCodeValid(true);
      } catch {
        // Expired/already-used/invalid — codeValid stays false.
      } finally {
        if (!cancelled) setCheckingCode(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [oobCode]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!recoveryKeyInput.trim()) {
      setError("Enter your Recovery Key.");
      return;
    }
    const parsedPassword = masterPasswordSchema.safeParse(newMasterPassword);
    if (!parsedPassword.success) {
      setError(parsedPassword.error.issues[0]?.message ?? "Invalid password.");
      return;
    }
    if (newMasterPassword !== confirmMasterPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { recoveryKey } = await recoverVault(
        oobCode,
        recoveryKeyInput,
        newMasterPassword,
      );
      setNewRecoveryKey(recoveryKey);
    } catch (err) {
      secureLogger.error("Vault recovery failed");
      setError(
        err instanceof Error
          ? err.message
          : "Recovery failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (newRecoveryKey) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          <p className="mb-4 text-sm text-text-secondary">
            Your vault has been recovered with a new master password. Your old
            Emergency Kit is no longer valid — here is a new one.
          </p>
          <EmergencyKit
            recoveryKey={newRecoveryKey}
            onContinue={() => router.push("/")}
          />
        </div>
      </main>
    );
  }

  if (checkingCode) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-text-secondary">Checking link…</p>
      </main>
    );
  }

  if (!oobCode || !codeValid) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-text-secondary">
          This recovery link is invalid or has expired.
        </p>
        <Link href="/recover" className="text-sm text-primary underline">
          Request a new one
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 sm:p-8">
      <AuthCard
        icon={KeyRound}
        title="Recover your vault"
        description="Enter the Recovery Key from your Emergency Kit and choose a new master password."
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="recoveryKey">Recovery Key</Label>
            <Input
              id="recoveryKey"
              type="text"
              autoComplete="off"
              autoFocus
              required
              value={recoveryKeyInput}
              onChange={(e) => setRecoveryKeyInput(e.target.value)}
              className="font-mono"
            />
          </div>

          <PasswordInput
            label="New master password"
            autoComplete="new-password"
            required
            value={newMasterPassword}
            onChange={(e) => setNewMasterPassword(e.target.value)}
          />

          <PasswordInput
            label="Confirm new master password"
            autoComplete="new-password"
            required
            value={confirmMasterPassword}
            onChange={(e) => setConfirmMasterPassword(e.target.value)}
          />

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" disabled={submitting}>
            {submitting ? "Recovering…" : "Recover vault"}
          </Button>
        </form>
      </AuthCard>
    </main>
  );
}
