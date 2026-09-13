import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { CustomField, CustomFieldType } from "@kryvex/types";
import { BooleanField } from "./BooleanField";
import { Button } from "./Button";
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
    <View style={styles.container}>
      <Text style={styles.heading}>Custom fields</Text>
      {fields.map((field, index) => (
        <View key={field.id} style={styles.row}>
          <View style={styles.labelRow}>
            <TextInput
              style={styles.labelInput}
              value={field.label}
              placeholder="Label"
              onChangeText={(label) => update(index, { label })}
            />
            <TouchableOpacity
              onPress={() => remove(index)}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>

          {/* Field-type picker reuses the tag-chip interaction pattern
              instead of a native <select>/picker dependency. */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.typeChipRow}>
              {CUSTOM_FIELD_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeChip,
                    field.type === type && styles.typeChipSelected,
                  ]}
                  onPress={() => update(index, { type })}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      field.type === type && styles.typeChipTextSelected,
                    ]}
                  >
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

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
        </View>
      ))}
      <Button onPress={add}>+ Add field</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  heading: { fontSize: 14, fontWeight: "600" },
  row: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 8,
  },
  removeButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  removeButtonText: { fontSize: 12, fontWeight: "600" },
  typeChipRow: { flexDirection: "row", gap: 6 },
  typeChip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeChipSelected: { backgroundColor: "#111827", borderColor: "#111827" },
  typeChipText: { fontSize: 12 },
  typeChipTextSelected: { color: "white" },
});
