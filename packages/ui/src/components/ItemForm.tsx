"use client";

import { Plus, Sparkles, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import type { CustomField, ItemContent, ItemType } from "@kryvex/types";
import { itemContentSchema } from "@kryvex/validation";
import { ITEM_TYPE_FIELD_CONFIG, type ItemFieldConfig } from "../fieldConfig";
import { BooleanField } from "./BooleanField";
import { Button } from "./ui/button";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import { DateField } from "./DateField";
import { Input } from "./ui/input";
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
  clipboardClearSeconds?: number | undefined;
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
  clipboardClearSeconds,
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

    // Spread initialContent FIRST: it carries fields that exist on this
    // type's ItemContent but aren't part of ITEM_TYPE_FIELD_CONFIG at all
    // (e.g. AttachmentItemContent.attachmentId, since image/pdf/file items
    // have an empty fixed-field list — it's an internal reference, never
    // user-edited — see fieldConfig.ts's header comment). Every field this
    // form actually edits (title/tags/notes/customFields/fixedFields) is
    // spread after, so it always wins over whatever initialContent had.
    const candidate = {
      ...(initialContent ?? {}),
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
              clipboardClearSeconds={clipboardClearSeconds}
            />
            {type === "login" && field.key === "password" && (
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => setShowGenerator((s) => !s)}
                >
                  <Sparkles className="h-4 w-4" strokeWidth={1.75} />
                  {showGenerator ? "Hide generator" : "Generate password"}
                </Button>
                {showGenerator && (
                  <PasswordGeneratorPanel
                    onUse={(generated) => {
                      updateFixed(field.key, generated);
                      setShowGenerator(false);
                    }}
                    clipboardClearSeconds={clipboardClearSeconds}
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
            <span className="font-medium text-foreground">{field.label}</span>
            {codes.map((code, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md border border-border bg-surface-2 p-2"
              >
                <Input
                  value={code.code}
                  onChange={(e) => {
                    const next = [...codes];
                    next[index] = { ...next[index]!, code: e.target.value };
                    updateFixed(field.key, next);
                  }}
                  className="h-9 flex-1 font-mono text-sm"
                />
                <label className="flex items-center gap-1.5 text-xs text-text-secondary">
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
                    className="h-3.5 w-3.5 rounded border-border-strong accent-primary"
                  />
                  Used
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    updateFixed(
                      field.key,
                      codes.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={() =>
                updateFixed(field.key, [...codes, { code: "", used: false }])
              }
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              Add code
            </Button>
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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
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

      <CustomFieldsEditor
        fields={customFields}
        onChange={setCustomFields}
        clipboardClearSeconds={clipboardClearSeconds}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
