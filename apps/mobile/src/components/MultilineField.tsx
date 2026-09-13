import { StyleSheet, Text, TextInput, View } from "react-native";

export interface MultilineFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export function MultilineField({
  label,
  value,
  onChange,
  rows = 4,
}: MultilineFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, { minHeight: rows * 20 }]}
        value={value}
        onChangeText={onChange}
        multiline
        textAlignVertical="top"
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 13, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
  },
});
