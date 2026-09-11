"use client";

import { useState, type FormEvent } from "react";
import type { CustomField, ItemContent, ItemType } from "@kryvex/types";
import { itemContentSchema } from "@kryvex/validation";
import { ITEM_TYPE_FIELD_CONFIG, type ItemFieldConfig } from "../fieldConfig";
import { BooleanField } from "./BooleanField";
import { Button } from "./Button";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import { DateField } from "./DateField";
import { MultilineField } from "./MultilineField";
import { PasswordGeneratorPanel } from "./PasswordGeneratorPanel";
import { SecretField } from "./SecretField";
import { TagsInput } from "./TagsInput";
import { TextField } from "./TextField";

export interface ItemFormProps {
  type: ItemType;
  initialContent?: ItemContent;
  onSubmit: (content: ItemContent) => void;
  onCancel: () => void;
  submitting?: boolean;
}

interface RecoveryCode {
  code: string;
  used: boolean;
}

function defaultFixedValue(kind: ItemFieldConfig["kind"]): unknown {
  switch (kind) {
    case "multiUrl":
      return [] as string[];
    case "codeList":
      return [] as RecoveryCode[];
    case "boolean":
      return false;
    default:
      return "";
  }
}

function initFixedFields(
  type: ItemType,
  initialContent: ItemContent | undefined,
): Record<string, unknown> {
  const config = ITEM_TYPE_FIELD_CONFIG[type];
  const fields: Record<string, unknown> = {};
  for (const field of config) {
    const existing = initialContent
      ? (initialContent as unknown as Record<string, unknown>)[field.key]
      : undefined;
    fields[field.key] = existing ?? defaultFixedValue(field.kind);
  }
  return fields;
}

/**
 * Generic, data-driven Add/Edit form — one implementation shared by all 11
 * ItemTypes rather than 11 hand-built forms, driven by
 * ITEM_TYPE_FIELD_CONFIG (see ../fieldConfig.ts). Validates the assembled
 * content against @kryvex/validation's itemContentSchema on submit; the
 * caller (apps/web) is responsible for encryption/persistence.
 */
export function ItemForm({
  type,
  initialContent,
  onSubmit,
  onCancel,
  submitting,
}: ItemFormProps) {
  const [title, setTitle] = useState(initialContent?.title ?? "");
  const [tags, setTags] = useState<string[]>(initialContent?.tags ?? []);
  const [notes, setNotes] = useState(initialContent?.notes ?? "");
  const [customFields, setCustomFields] = useState<CustomField[]>(
    initialContent?.customFields ?? [],
  );
  const [fixedFields, setFixedFields] = useState<Record<string, unknown>>(() =>
    initFixedFields(type, initialContent),
  );
  const [showGenerator, setShowGenerator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const config = ITEM_TYPE_FIELD_CONFIG[type];

  function updateFixed(key: string, value: unknown) {
    setFixedFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const candidate = {
      type,
      title,
      tags,
      notes: notes || undefined,
      customFields,
      ...fixedFields,
    };

    const parsed = itemContentSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid item.");
      return;
    }
    onSubmit(parsed.data);
  }

  function renderFixedField(field: ItemFieldConfig) {
    const value = fixedFields[field.key];

    switch (field.kind) {
      case "secret": {
        const stringValue = typeof value === "string" ? value : "";
        return (
          <div key={field.key} className="flex flex-col gap-2">
            <SecretField
              label={field.label}
              value={stringValue}
              required={field.required}
              onChange={(v) => updateFixed(field.key, v)}
            />
            {type === "login" && field.key === "password" && (
              <div className="flex flex-col gap-2">
                <Button onClick={() => setShowGenerator((s) => !s)}>
                  {showGenerator ? "Hide generator" : "Generate password"}
                </Button>
                {showGenerator && (
                  <PasswordGeneratorPanel
                    onUse={(generated) => {
                      updateFixed(field.key, generated);
                      setShowGenerator(false);
                    }}
                  />
                )}
              </div>
            )}
          </div>
        );
      }
      case "multiline":
        return (
          <MultilineField
            key={field.key}
            label={field.label}
            value={typeof value === "string" ? value : ""}
            onChange={(v) => updateFixed(field.key, v)}
          />
        );
      case "boolean":
        return (
          <BooleanField
            key={field.key}
            label={field.label}
            checked={value === true}
            onChange={(v) => updateFixed(field.key, v)}
          />
        );
      case "date":
        return (
          <DateField
            key={field.key}
            label={field.label}
            value={typeof value === "string" ? value : ""}
            onChange={(v) => updateFixed(field.key, v)}
          />
        );
      case "multiUrl":
        return (
          <TagsInput
            key={field.key}
            label={field.label}
            values={Array.isArray(value) ? (value as string[]) : []}
            onChange={(v) => updateFixed(field.key, v)}
            placeholder="Add a URL and press Enter"
          />
        );
      case "codeList": {
        const codes = Array.isArray(value) ? (value as RecoveryCode[]) : [];
        return (
          <div key={field.key} className="flex flex-col gap-2 text-sm">
            <span>{field.label}</span>
            {codes.map((code, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={code.code}
                  onChange={(e) => {
                    const next = [...codes];
                    next[index] = { ...next[index]!, code: e.target.value };
                    updateFixed(field.key, next);
                  }}
                  className="flex-1 rounded border px-2 py-1"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={code.used}
                    onChange={(e) => {
                      const next = [...codes];
                      next[index] = {
                        ...next[index]!,
                        used: e.target.checked,
                      };
                      updateFixed(field.key, next);
                    }}
                  />
                  Used
                </label>
                <button
                  type="button"
                  onClick={() =>
                    updateFixed(
                      field.key,
                      codes.filter((_, i) => i !== index),
                    )
                  }
                  className="rounded border px-2 py-1 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                updateFixed(field.key, [...codes, { code: "", used: false }])
              }
              className="self-start rounded border px-3 py-1 text-xs"
            >
              + Add code
            </button>
          </div>
        );
      }
      case "url":
      case "email":
      case "number":
      case "text":
      default:
        return (
          <TextField
            key={field.key}
            label={field.label}
            value={typeof value === "string" ? value : ""}
            type={
              field.kind === "url"
                ? "url"
                : field.kind === "email"
                  ? "email"
                  : field.kind === "number"
                    ? "number"
                    : "text"
            }
            required={field.required}
            onChange={(v) => updateFixed(field.key, v)}
          />
        );
    }
  }

  return (
    // noValidate: we show our own itemContentSchema-driven error message
    // (below) rather than the browser's native required-field tooltip —
    // without this, native constraint validation silently blocks the
    // submit event before handleSubmit (and our error message) ever runs.
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <TextField label="Title" value={title} required onChange={setTitle} />
      <TagsInput
        label="Tags"
        values={tags}
        onChange={setTags}
        placeholder="Add a tag and press Enter"
      />
      <MultilineField
        label="Notes"
        value={notes}
        onChange={setNotes}
        rows={3}
      />

      {config.map((field) => renderFixedField(field))}

      <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
