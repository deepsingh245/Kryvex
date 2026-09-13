import { StyleSheet, Switch, Text, View } from "react-native";

export interface BooleanFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function BooleanField({ label, checked, onChange }: BooleanFieldProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch value={checked} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  label: { fontSize: 13, fontWeight: "500" },
});
