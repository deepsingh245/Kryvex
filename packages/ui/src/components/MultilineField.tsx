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
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border px-3 py-2"
      />
    </label>
  );
}
