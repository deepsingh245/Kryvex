import { Progress, cn } from "@kryvex/ui";
import { evaluateMasterPassword } from "./passwordRequirements";

interface PasswordStrengthMeterProps {
  password: string;
}

const LEVELS = [
  { label: "Weak", indicator: "bg-destructive", text: "text-destructive" },
  { label: "Fair", indicator: "bg-warning", text: "text-warning" },
  { label: "Good", indicator: "bg-info", text: "text-info" },
  { label: "Strong", indicator: "bg-success", text: "text-success" },
] as const;

/**
 * Strength feedback derived from the same 4 requirements as the checklist
 * below it — deliberately not a separate/fancier entropy estimate, so the
 * meter and checklist can never disagree. See KRYVEX_UI_README.md §21:
 * "Strength feedback should be clear but not noisy."
 */
export function PasswordStrengthMeter({
  password,
}: PasswordStrengthMeterProps) {
  const { metCount } = evaluateMasterPassword(password);
  const level = LEVELS[Math.max(0, metCount - 1)] ?? LEVELS[0];
  const empty = password.length === 0;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">Password strength</span>
        {!empty && (
          <span className={cn("font-medium", level.text)}>{level.label}</span>
        )}
      </div>
      <Progress
        value={empty ? 0 : metCount}
        max={4}
        indicatorClassName={empty ? "bg-transparent" : level.indicator}
      />
    </div>
  );
}
