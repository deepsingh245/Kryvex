"use client";

import { X } from "lucide-react";
import { useId, useState, type KeyboardEvent } from "react";
import { Label } from "./ui/label";

export interface TagsInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

// Shared by ItemContentBase.tags and LoginContent.websites — both are
// plain string lists edited as removable chips.
export function TagsInput({
  label,
  values,
  onChange,
  placeholder,
}: TagsInputProps) {
  const [draft, setDraft] = useState("");
  const inputId = useId();

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit();
    }
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 py-2 shadow-sm focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/40">
        {values.map((value) => (
          <span
            key={value}
            className="flex items-center gap-1 rounded-full bg-surface-2 py-1 pl-2.5 pr-1.5 text-xs font-medium text-text-secondary"
          >
            {value}
            <button
              type="button"
              onClick={() => remove(value)}
              aria-label={`Remove ${value}`}
              className="rounded-full p-0.5 text-text-muted transition-colors hover:bg-border-strong hover:text-foreground"
            >
              <X className="h-3 w-3" strokeWidth={2} />
            </button>
          </span>
        ))}
        <input
          id={inputId}
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={commit}
          className="min-w-24 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-text-muted"
        />
      </div>
    </div>
  );
}
