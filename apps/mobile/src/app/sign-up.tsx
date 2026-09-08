import { useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signUpFormSchema } from "@kryvex/validation";
import { secureLogger } from "@kryvex/security";
import { useVault } from "@/providers/VaultProvider";

export default function SignUpScreen() {
  const { signUp } = useVault();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = signUpFormSchema.safeParse({
      email,
      masterPassword,
      confirmMasterPassword,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }
    setSubmitting(true);
    try {
      await signUp(parsed.data.email, parsed.data.masterPassword);
      router.replace("/");
    } catch (err) {
      secureLogger.error("Sign-up failed", { email: parsed.data.email });
      setError(
        err instanceof Error
          ? err.message
          : "Sign-up failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create your Kryvex vault</Text>
      <Text style={styles.hint}>
        Your master password protects your vault. Kryvex cannot simply send it
        to the server and recover your vault for you.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoComplete="email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Master password"
        secureTextEntry
        autoComplete="new-password"
        value={masterPassword}
        onChangeText={setMasterPassword}
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm master password"
        secureTextEntry
        autoComplete="new-password"
        value={confirmMasterPassword}
        onChangeText={setConfirmMasterPassword}
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity
        style={styles.button}
        onPress={() => void handleSubmit()}
        disabled={submitting}
      >
        <Text style={styles.buttonText}>
          {submitting ? "Creating vault…" : "Create vault"}
        </Text>
      </TouchableOpacity>

      <Link href="/sign-in" style={styles.link}>
        Already have a vault? Sign in
      </Link>
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
  link: {
    textAlign: "center",
    color: "#6b7280",
    textDecorationLine: "underline",
  },
});
