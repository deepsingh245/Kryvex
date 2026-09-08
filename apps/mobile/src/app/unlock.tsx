import { useEffect, useState } from "react";
import { Redirect, useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { secureLogger } from "@kryvex/security";
import { useVault } from "@/providers/VaultProvider";

export default function UnlockScreen() {
  const { state, unlock } = useVault();
  const router = useRouter();
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (state.status === "UNLOCKED") router.replace("/");
  }, [state.status, router]);

  if (state.status === "SIGNED_OUT") return <Redirect href="/sign-in" />;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await unlock(masterPassword);
      router.replace("/");
    } catch {
      secureLogger.error("Unlock failed");
      setError("Incorrect master password.");
    } finally {
      setSubmitting(false);
    }
  }

  const user =
    state.status === "AUTHENTICATED_LOCKED" || state.status === "UNLOCKING"
      ? state.user
      : null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Unlock your vault</Text>
      {user && <Text style={styles.hint}>Signed in as {user.email}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Master password"
        secureTextEntry
        autoFocus
        autoComplete="current-password"
        value={masterPassword}
        onChangeText={setMasterPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={() => void handleSubmit()}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Unlocking…" : "Unlock"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  hint: { fontSize: 13, color: "#6b7280" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
  },
  error: { color: "#dc2626", fontSize: 13 },
  button: {
    backgroundColor: "#111827",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  buttonText: { color: "white", fontWeight: "600" },
});
