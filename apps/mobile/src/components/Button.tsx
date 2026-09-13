import type { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";

export interface ButtonProps {
  children: ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean | undefined;
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps["variant"]>, ViewStyle> = {
  primary: { backgroundColor: "#111827", borderColor: "#111827" },
  secondary: { backgroundColor: "transparent", borderColor: "#d1d5db" },
  danger: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
};

const VARIANT_TEXT_COLOR: Record<
  NonNullable<ButtonProps["variant"]>,
  string
> = {
  primary: "white",
  secondary: "#111827",
  danger: "white",
};

export function Button({
  children,
  onPress,
  variant = "secondary",
  disabled,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        VARIANT_STYLES[variant],
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, { color: VARIANT_TEXT_COLOR[variant] }]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
  },
  disabled: { opacity: 0.5 },
  text: { fontSize: 14, fontWeight: "600" },
});
