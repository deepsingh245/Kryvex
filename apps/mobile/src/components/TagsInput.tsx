import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export interface TagsInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

// Shared by ItemContentBase.tags and LoginContent.websites — both are
// plain string lists edited as removable chips, same as web's TagsInput.
export function TagsInput({
  label,
  values,
  onChange,
  placeholder,
}: TagsInputProps) {
  const [draft, setDraft] = useState("");

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
    }
    setDraft("");
  }

  function remove(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {values.map((value) => (
          <TouchableOpacity
            key={value}
            style={styles.chip}
            onPress={() => remove(value)}
          >
            <Text style={styles.chipText}>{value} ×</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          value={draft}
          placeholder={placeholder}
          onChangeText={setDraft}
          onSubmitEditing={commit}
          onBlur={commit}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.addButton} onPress={commit}>
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: "#f3f4f6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12 },
  addRow: { flexDirection: "row", gap: 6 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
  },
  addButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  addButtonText: { fontSize: 13, fontWeight: "600" },
});
