import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";

export interface SecretFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  required?: boolean;
}

// No clipboard-clear-after-timeout here — that's Phase 7
// (packages/security/src/clipboard.ts, currently a stub). Flagged as a
// documented Phase 4b limitation, same as web's SecretField, not silently
// shipped as if handled.
export function SecretField({
  label,
  value,
  onChange,
  readOnly,
}: SecretFieldProps) {
  const [revealed, setRevealed] = useState(false);

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(value);
    } catch {
      // Clipboard can be unavailable/denied — no-op; no secret is exposed
      // either way.
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          editable={!readOnly}
          secureTextEntry={!revealed}
          autoCapitalize="none"
          accessibilityLabel={label}
        />
        <TouchableOpacity
          style={styles.smallButton}
          onPress={() => setRevealed((r) => !r)}
        >
          <Text style={styles.smallButtonText}>
            {revealed ? "Hide" : "Reveal"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.smallButton}
          onPress={() => void handleCopy()}
        >
          <Text style={styles.smallButtonText}>Copy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 13, fontWeight: "500" },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
  },
  smallButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  smallButtonText: { fontSize: 12, fontWeight: "600" },
});
