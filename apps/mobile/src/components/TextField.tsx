import { StyleSheet, Text, TextInput, View } from "react-native";

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "url" | "date" | "number";
  required?: boolean;
  autoComplete?: string;
}

const KEYBOARD_TYPE: Record<
  NonNullable<TextFieldProps["type"]>,
  "default" | "email-address" | "url" | "numeric"
> = {
  text: "default",
  date: "default",
  email: "email-address",
  url: "url",
  number: "numeric",
};

// `required`/`autoComplete` are accepted for prop-shape parity with the
// web TextField (ItemForm passes them uniformly across platforms) but
// aren't wired to RN visuals: RN has no native form-validation concept,
// and RN's TextInput `autoComplete` only accepts a narrow platform-specific
// token union rather than the free-form HTML autocomplete strings callers
// pass here.
export function TextField({
  label,
  value,
  onChange,
  type = "text",
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={KEYBOARD_TYPE[type]}
        autoCapitalize="none"
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
