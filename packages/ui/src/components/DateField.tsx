import { TextField } from "./TextField";

export interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function DateField({ label, value, onChange }: DateFieldProps) {
  return (
    <TextField label={label} value={value} onChange={onChange} type="date" />
  );
}
