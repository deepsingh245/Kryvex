"use client";

import type { CustomField, CustomFieldType } from "@kryvex/types";
import { BooleanField } from "./BooleanField";
import { DateField } from "./DateField";
import { MultilineField } from "./MultilineField";
import { SecretField } from "./SecretField";
import { TextField } from "./TextField";

const CUSTOM_FIELD_TYPES: CustomFieldType[] = [
  "text",
  "secret",
  "url",
  "email",
  "number",
  "date",
  "multiline",
  "boolean",
  "totp",
];

export interface CustomFieldsEditorProps {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

function newFieldId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `field-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CustomFieldsEditor({
  fields,
  onChange,
}: CustomFieldsEditorProps) {
  function update(index: number, patch: Partial<CustomField>) {
    const next = [...fields];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function add() {
    onChange([
      ...fields,
      { id: newFieldId(), label: "", type: "text", value: "" },
    ]);
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-medium">Custom fields</span>
      {fields.map((field, index) => (
        <div key={field.id} className="flex flex-col gap-2 rounded border p-3">
          <div className="flex items-center gap-2">
            <input
              value={field.label}
              placeholder="Label"
              onChange={(e) => update(index, { label: e.target.value })}
              className="flex-1 rounded border px-2 py-1 text-sm"
            />
            <select
              value={field.type}
              onChange={(e) =>
                update(index, { type: e.target.value as CustomFieldType })
              }
              className="rounded border px-2 py-1 text-sm"
            >
              {CUSTOM_FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded border px-2 py-1 text-xs"
            >
              Remove
            </button>
          </div>

          {field.type === "secret" || field.type === "totp" ? (
            <SecretField
              label="Value"
              value={field.value}
              onChange={(value) => update(index, { value })}
            />
          ) : field.type === "multiline" ? (
            <MultilineField
              label="Value"
              value={field.value}
              onChange={(value) => update(index, { value })}
            />
          ) : field.type === "boolean" ? (
            <BooleanField
              label="Value"
              checked={field.value === "true"}
              onChange={(checked) => update(index, { value: String(checked) })}
            />
          ) : field.type === "date" ? (
            <DateField
              label="Value"
              value={field.value}
              onChange={(value) => update(index, { value })}
            />
          ) : (
            <TextField
              label="Value"
              value={field.value}
              type={
                field.type === "email"
                  ? "email"
                  : field.type === "url"
                    ? "url"
                    : field.type === "number"
                      ? "number"
                      : "text"
              }
              onChange={(value) => update(index, { value })}
            />
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="self-start rounded border px-3 py-1 text-sm"
      >
        + Add field
      </button>
    </div>
  );
}
