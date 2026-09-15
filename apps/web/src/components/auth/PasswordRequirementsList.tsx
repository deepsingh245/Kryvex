import { Check, X } from "lucide-react";
import { evaluateMasterPassword } from "./passwordRequirements";

interface PasswordRequirementsListProps {
  password: string;
}

export function PasswordRequirementsList({
  password,
}: PasswordRequirementsListProps) {
  const { requirements } = evaluateMasterPassword(password);

  return (
    <ul className="flex flex-col gap-1.5" aria-label="Password requirements">
      {requirements.map((req) => (
        <li
          key={req.id}
          className="flex items-center gap-2 text-sm"
          aria-label={`${req.label}: ${req.met ? "met" : "not met"}`}
        >
          {req.met ? (
            <Check
              className="h-4 w-4 shrink-0 text-success"
              strokeWidth={2}
              aria-hidden="true"
            />
          ) : (
            <X
              className="h-4 w-4 shrink-0 text-text-muted"
              strokeWidth={2}
              aria-hidden="true"
            />
          )}
          <span className={req.met ? "text-foreground" : "text-text-secondary"}>
            {req.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
