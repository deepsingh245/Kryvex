"use client";

import { Plus, Trash2 } from "lucide-react";
import type { CustomField, CustomFieldType } from "@kryvex/types";
import { BooleanField } from "./BooleanField";
import { DateField } from "./DateField";
import { MultilineField } from "./MultilineField";
import { SecretField } from "./SecretField";
import { TextField } from "./TextField";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select } from "./ui/select";

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
  clipboardClearSeconds?: number | undefined;
}

// CSPRNG-backed fallback for the (practically unreachable on any modern
// runtime) case where crypto.randomUUID is unavailable but
// crypto.getRandomValues still is — never Math.random(), even for a
// non-secret id, per CLAUDE.md's hard rule.
function randomIdFallback(prefix: string): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${prefix}-${Date.now()}-${hex}`;
}

function newFieldId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : randomIdFallback("field");
}

export function CustomFieldsEditor({
  fields,
  onChange,
  clipboardClearSeconds,
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
      <span className="text-sm font-medium text-foreground">
        Custom fields
      </span>
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-3"
        >
          <div className="flex items-center gap-2">
            <Input
              value={field.label}
              placeholder="Label"
              aria-label="Custom field label"
              onChange={(e) => update(index, { label: e.target.value })}
              className="h-9 flex-1 text-sm"
            />
            <Select
              value={field.type}
              aria-label="Custom field type"
              onChange={(e) =>
                update(index, { type: e.target.value as CustomFieldType })
              }
              className="h-9 w-auto min-w-28 text-sm"
            >
              {CUSTOM_FIELD_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              Remove
            </Button>
          </div>

          {field.type === "secret" || field.type === "totp" ? (
            <SecretField
              label="Value"
              value={field.value}
              onChange={(value) => update(index, { value })}
              clipboardClearSeconds={clipboardClearSeconds}
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
      <Button type="button" variant="secondary" size="sm" onClick={add} className="self-start">
        <Plus className="h-4 w-4" strokeWidth={1.75} />
        Add field
      </Button>
    </div>
  );
}
