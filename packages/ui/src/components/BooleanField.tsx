import { useId } from "react";

export interface BooleanFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function BooleanField({ label, checked, onChange }: BooleanFieldProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-2.5 text-sm text-foreground"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border-strong bg-surface text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      />
      {label}
    </label>
  );
}
