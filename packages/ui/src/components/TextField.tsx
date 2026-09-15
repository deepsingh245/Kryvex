import { useId } from "react";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "url" | "date" | "number";
  required?: boolean | undefined;
  autoComplete?: string;
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  autoComplete,
}: TextFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
