import { StyleSheet, Text, View } from "react-native";
import { KRYVEX_BRAND_COLOR } from "@kryvex/ui";

/**
 * Phase 1 placeholder only — proves apps/mobile resolves and renders a
 * workspace package (@kryvex/ui) end-to-end. No vault UI, no auth
 * (Phase 2-4 work). See docs/ARCHITECTURE.md §5 for the real screen map.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kryvex is scaffolded</Text>
      <Text style={styles.subtitle}>Phase 1 foundation — no vault UI yet.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: KRYVEX_BRAND_COLOR,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
