import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { CustomField, ItemContent, ItemType } from "@kryvex/types";
import { itemContentSchema } from "@kryvex/validation";
import { ITEM_TYPE_FIELD_CONFIG, type ItemFieldConfig } from "@kryvex/ui";
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
 * Generic, data-driven Add/Edit form — RN counterpart of
 * packages/ui/src/components/ItemForm.tsx, same validation logic
 * (itemContentSchema) and same ITEM_TYPE_FIELD_CONFIG-driven field
 * rendering, RN JSX instead of DOM JSX.
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

  function handleSubmit() {
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
          <View key={field.key} style={{ gap: 8 }}>
            <SecretField
              label={field.label}
              value={stringValue}
              onChange={(v) => updateFixed(field.key, v)}
            />
            {type === "login" && field.key === "password" && (
              <View style={{ gap: 8 }}>
                <Button onPress={() => setShowGenerator((s) => !s)}>
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
              </View>
            )}
          </View>
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
            placeholder="Add a URL"
          />
        );
      case "codeList": {
        const codes = Array.isArray(value) ? (value as RecoveryCode[]) : [];
        return (
          <View key={field.key} style={{ gap: 6 }}>
            <Text style={styles.codeListLabel}>{field.label}</Text>
            {codes.map((code, index) => (
              <View key={index} style={styles.codeRow}>
                <TextInput
                  style={styles.codeInput}
                  value={code.code}
                  onChangeText={(text) => {
                    const next = [...codes];
                    next[index] = { ...next[index]!, code: text };
                    updateFixed(field.key, next);
                  }}
                />
                <Button
                  onPress={() =>
                    updateFixed(
                      field.key,
                      codes.filter((_, i) => i !== index),
                    )
                  }
                >
                  Remove
                </Button>
              </View>
            ))}
            <Button
              onPress={() =>
                updateFixed(field.key, [...codes, { code: "", used: false }])
              }
            >
              + Add code
            </Button>
          </View>
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
            onChange={(v) => updateFixed(field.key, v)}
          />
        );
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.form}>
      <TextField label="Title" value={title} onChange={setTitle} />
      <TagsInput
        label="Tags"
        values={tags}
        onChange={setTags}
        placeholder="Add a tag"
      />
      <MultilineField
        label="Notes"
        value={notes}
        onChange={setNotes}
        rows={3}
      />

      {config.map((field) => renderFixedField(field))}

      <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Button variant="primary" onPress={handleSubmit} disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
        <Button onPress={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, padding: 16 },
  error: { color: "#dc2626", fontSize: 13 },
  actions: { flexDirection: "row", gap: 8 },
  codeListLabel: { fontSize: 13, fontWeight: "500" },
  codeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 8,
  },
});
