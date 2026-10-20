import kryvexMark from "../../assets/images/kryvex-mark.png";
import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

interface BrandLogoProps {
  size?: number;
  showWordmark?: boolean;
  inverse?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Shared native brand lockup for entry, vault, and privacy surfaces. */
export function BrandLogo({
  size = 44,
  showWordmark = true,
  inverse = false,
  style,
}: BrandLogoProps) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel="Kryvex"
      style={[styles.root, style]}
    >
      <View
        style={[
          styles.markPlate,
          {
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.24),
          },
        ]}
      >
        <Image
          source={kryvexMark}
          resizeMode="contain"
          style={{ width: size * 0.9, height: size * 0.9 }}
        />
      </View>
      {showWordmark && (
        <Text
          accessible={false}
          style={[styles.wordmark, { color: inverse ? "#ffffff" : "#0f172a" }]}
        >
          KRYVEX
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", alignItems: "center", gap: 10 },
  markPlate: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fbff",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
  },
  wordmark: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 2.4,
  },
});
