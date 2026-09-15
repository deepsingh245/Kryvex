import { useId } from "react";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export interface MultilineFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export function MultilineField({
  label,
  value,
  onChange,
  rows = 4,
}: MultilineFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
