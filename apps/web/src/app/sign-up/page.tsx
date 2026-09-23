"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { signUpFormSchema, type SignUpFormInput } from "@kryvex/validation";
import { secureLogger } from "@kryvex/security";
import { Button, EmergencyKit, Input, Label } from "@kryvex/ui";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PasswordRequirementsList } from "@/components/auth/PasswordRequirementsList";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";
import { useVault } from "@/providers/VaultProvider";

/**
 * Screen 02 — Create Master Password. See KRYVEX_UI_README.md §21. Kept as
 * one combined email + master-password screen (the app's existing sign-up
 * architecture) — only the visual layer changes; signUp()/EmergencyKit flow
 * is unchanged.
 */
export default function SignUpPage() {
  const { signUp } = useVault();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignUpFormInput>({
    // emailSchema's z.preprocess (trim/lowercase before validating) gives
    // zodResolver an input type of `unknown` for that field, which doesn't
    // structurally match RHF's FieldValues — the cast is a type-only
    // workaround for that friction, not a change in runtime validation.
    resolver: zodResolver(signUpFormSchema) as Resolver<SignUpFormInput>,
    defaultValues: { email: "", masterPassword: "", confirmMasterPassword: "" },
  });
  // useWatch (not the destructured watch()) so React Compiler can memoize
  // this component — watch() returns a plain function the compiler can't
  // safely analyze.
  const masterPassword = useWatch({ control, name: "masterPassword" }) ?? "";

  async function onSubmit(data: SignUpFormInput) {
    setFormError(null);
    setSubmitting(true);
    try {
      const { recoveryKey } = await signUp(data.email, data.masterPassword);
      // Show the Emergency Kit before navigating away — see
      // docs/RECOVERY.md §2: it's shown exactly once, here.
      setRecoveryKey(recoveryKey);
    } catch (err) {
      secureLogger.error("Sign-up failed", { email: data.email });
      setFormError(
        err instanceof Error
          ? err.message
          : "Sign-up failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (recoveryKey) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm">
          <EmergencyKit
            recoveryKey={recoveryKey}
            onContinue={() => router.push("/")}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-6 sm:p-8">
      <AuthCard
        icon={ShieldCheck}
        title="Create Master Password"
        description="This password will be used to encrypt your vault. Make it strong and memorable."
        onBack={() => router.push("/welcome")}
      >
        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col gap-5"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p
                id="email-error"
                role="alert"
                className="text-sm text-destructive"
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <PasswordInput
            label="Master password"
            autoComplete="new-password"
            {...register("masterPassword")}
          />

          <PasswordStrengthMeter password={masterPassword} />

          <PasswordInput
            label="Confirm password"
            autoComplete="new-password"
            error={errors.confirmMasterPassword?.message}
            {...register("confirmMasterPassword")}
          />

          <PasswordRequirementsList password={masterPassword} />

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="mt-1"
          >
            {submitting ? "Creating vault…" : "Continue"}
          </Button>

          <Link
            href="/sign-in"
            className="text-center text-sm text-text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Already have a vault? Sign in
          </Link>
        </form>
      </AuthCard>
    </main>
  );
}
