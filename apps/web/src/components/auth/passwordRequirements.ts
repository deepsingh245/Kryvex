/**
 * Mirrors masterPasswordSchema (packages/validation/src/auth.ts) exactly —
 * the Screen 02 checklist must never show a requirement as "met" that the
 * schema wouldn't also accept, or vice versa. Uppercase/lowercase are two
 * separate schema refinements but one combined checklist item, per
 * KRYVEX_UI_README.md §21's exact copy ("Include uppercase and lowercase").
 */
export interface PasswordRequirement {
  id: string;
  label: string;
  met: boolean;
}

export function evaluateMasterPassword(password: string): {
  requirements: PasswordRequirement[];
  metCount: number;
} {
  const requirements: PasswordRequirement[] = [
    {
      id: "length",
      label: "At least 12 characters",
      met: password.length >= 12,
    },
    {
      id: "case",
      label: "Include uppercase and lowercase",
      met: /[a-z]/.test(password) && /[A-Z]/.test(password),
    },
    {
      id: "number",
      label: "Include a number",
      met: /[0-9]/.test(password),
    },
    {
      id: "special",
      label: "Include a special character",
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return {
    requirements,
    metCount: requirements.filter((r) => r.met).length,
  };
}
