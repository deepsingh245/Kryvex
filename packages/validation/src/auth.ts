/**
 * Sign-up/sign-in form input validation. See docs/CRYPTOGRAPHIC_ARCHITECTURE.md
 * §6 for master-password guidance — this schema enforces only a minimum-length
 * floor, not a strength meter (out of scope for Phase 2).
 */

import { z } from "zod";

// Normalize (trim/lowercase) BEFORE the email-format check runs, not after:
// z.email().trim() applies the format check to the raw input first, so
// " User@Example.com " would fail the regex before trim ever ran.
export const emailSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z.email(),
);

export const masterPasswordSchema = z
  .string()
  .min(12, "Master password must be at least 12 characters.")
  .refine((v) => v.trim().length > 0, "Master password cannot be blank.");

export const signUpFormSchema = z
  .object({
    email: emailSchema,
    masterPassword: masterPasswordSchema,
    confirmMasterPassword: z.string(),
  })
  .refine((d) => d.masterPassword === d.confirmMasterPassword, {
    message: "Passwords do not match.",
    path: ["confirmMasterPassword"],
  });

// Sign-in deliberately does not enforce the 12-char minimum: an existing
// account may predate a policy change, and a too-short input just means
// "wrong password" either way — Firebase's own rejection is the real signal.
export const signInFormSchema = z.object({
  email: emailSchema,
  masterPassword: z.string().min(1, "Master password is required."),
});

export type SignUpFormInput = z.infer<typeof signUpFormSchema>;
export type SignInFormInput = z.infer<typeof signInFormSchema>;
