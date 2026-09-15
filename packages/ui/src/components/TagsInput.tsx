"use client";

import { useId, useState, type KeyboardEvent } from "react";

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
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={inputId}>{label}</label>
      <div className="flex flex-wrap items-center gap-2 rounded border px-3 py-2">
        {values.map((value) => (
          <span
            key={value}
            className="flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs"
          >
            {value}
            <button
              type="button"
              onClick={() => remove(value)}
              aria-label={`Remove ${value}`}
            >
              ×
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
          className="min-w-24 flex-1 outline-none"
        />
      </div>
    </div>
  );
}
