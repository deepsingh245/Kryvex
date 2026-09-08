import { Redirect } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { KRYVEX_BRAND_COLOR } from "@kryvex/ui";
import { useVault } from "@/providers/VaultProvider";

/**
 * Gated home — redirects based on LockState. Phase 2 scope only: once
 * UNLOCKED there's no vault content yet (Phase 4), just a stub. Recovery
 * kit / biometric opt-in (build spec §54, Phase 3/7) would insert here,
 * between a fresh sign-up's UNLOCK_SUCCEEDED and landing on this screen —
 * not built yet.
 */
export default function HomeScreen() {
  const { state, signOut } = useVault();

  if (state.status === "SIGNED_OUT") return <Redirect href="/sign-in" />;
  if (state.status === "AUTHENTICATED_LOCKED")
    return <Redirect href="/unlock" />;

  if (state.status === "UNLOCKED") {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: KRYVEX_BRAND_COLOR }]}>
          Your vault is empty
        </Text>
        <Text style={styles.hint}>
          Signed in as {state.user.email} — no items yet (Phase 4 work).
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => void signOut()}>
          <Text style={styles.buttonText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // UNLOCKING / LOCKING
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 32,
  },
  title: { fontSize: 22, fontWeight: "600", textAlign: "center" },
  hint: { fontSize: 14, color: "#6b7280", textAlign: "center" },
  button: {
    borderWidth: 1,
    borderColor: "#111827",
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: { fontWeight: "600" },
});
