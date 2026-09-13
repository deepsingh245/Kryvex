import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  DEFAULT_GENERATOR_OPTIONS,
  generatePassword,
  type GeneratePasswordOptions,
} from "@kryvex/password-generator";
import { Button } from "./Button";

export interface PasswordGeneratorPanelProps {
  // Present when embedded (e.g. in the Login form's password SecretField);
  // omitted on the standalone Generator screen.
  onUse?: (password: string) => void;
}

const LENGTH_STEP = 4;
const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

// +/- stepper instead of a native range slider — avoids a new native
// dependency for this pass (see plan §1).
export function PasswordGeneratorPanel({ onUse }: PasswordGeneratorPanelProps) {
  const [options, setOptions] = useState<GeneratePasswordOptions>(
    DEFAULT_GENERATOR_OPTIONS,
  );
  const [password, setPassword] = useState(() =>
    generatePassword(DEFAULT_GENERATOR_OPTIONS),
  );

  function regenerate(next: GeneratePasswordOptions = options) {
    try {
      setPassword(generatePassword(next));
    } catch {
      // Every character set disabled — leave the last valid password
      // displayed rather than clearing it to an empty/invalid value.
    }
  }

  function update(patch: Partial<GeneratePasswordOptions>) {
    const next = { ...options, ...patch };
    setOptions(next);
    regenerate(next);
  }

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(password);
    } catch {
      // Clipboard can be unavailable/denied — no-op.
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.password}>{password}</Text>

      <View style={styles.row}>
        <Button onPress={() => regenerate()}>Regenerate</Button>
        <Button onPress={() => void handleCopy()}>Copy</Button>
        {onUse && (
          <Button variant="primary" onPress={() => onUse(password)}>
            Use
          </Button>
        )}
      </View>

      <View style={styles.row}>
        <Button
          disabled={options.length <= MIN_LENGTH}
          onPress={() =>
            update({
              length: Math.max(MIN_LENGTH, options.length - LENGTH_STEP),
            })
          }
        >
          -
        </Button>
        <Text style={styles.lengthLabel}>Length: {options.length}</Text>
        <Button
          disabled={options.length >= MAX_LENGTH}
          onPress={() =>
            update({
              length: Math.min(MAX_LENGTH, options.length + LENGTH_STEP),
            })
          }
        >
          +
        </Button>
      </View>

      <ToggleRow
        label="a-z"
        value={options.includeLowercase}
        onChange={(v) => update({ includeLowercase: v })}
      />
      <ToggleRow
        label="A-Z"
        value={options.includeUppercase}
        onChange={(v) => update({ includeUppercase: v })}
      />
      <ToggleRow
        label="0-9"
        value={options.includeDigits}
        onChange={(v) => update({ includeDigits: v })}
      />
      <ToggleRow
        label="!@#"
        value={options.includeSymbols}
        onChange={(v) => update({ includeSymbols: v })}
      />
      <ToggleRow
        label="Exclude ambiguous"
        value={options.excludeAmbiguous}
        onChange={(v) => update({ excludeAmbiguous: v })}
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
  },
  password: {
    fontFamily: "monospace",
    fontSize: 15,
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    padding: 8,
  },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  lengthLabel: { fontSize: 13, fontWeight: "500" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: { fontSize: 13 },
});
