import { Link, Redirect } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { PasswordGeneratorPanel } from "@/components/PasswordGeneratorPanel";
import { useVault } from "@/providers/VaultProvider";

// Gated the same way as every other screen (SIGNED_OUT -> /sign-in) for UI
// consistency, even though generating a password needs no vault key —
// same as web's /generator route.
export default function GeneratorScreen() {
  const { state } = useVault();

  if (state.status === "SIGNED_OUT") return <Redirect href="/sign-in" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Password Generator</Text>
      <PasswordGeneratorPanel />
      <Link href="/" style={styles.link}>
        Back to vault
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: "600", textAlign: "center" },
  link: {
    fontSize: 13,
    color: "#6b7280",
    textDecorationLine: "underline",
    textAlign: "center",
  },
});
