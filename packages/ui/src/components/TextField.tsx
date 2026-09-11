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
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border px-3 py-2"
      />
    </label>
  );
}
