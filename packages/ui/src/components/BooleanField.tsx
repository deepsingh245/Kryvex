export interface BooleanFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function BooleanField({ label, checked, onChange }: BooleanFieldProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}
