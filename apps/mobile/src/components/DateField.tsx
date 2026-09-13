import { TextField } from "./TextField";

export interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// Plain text input, no native date picker — matches web's DateField.tsx's
// own simplicity precedent (no new native dependency for this pass).
export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <TextField label={label} value={value} onChange={onChange} type="date" />
  );
}
