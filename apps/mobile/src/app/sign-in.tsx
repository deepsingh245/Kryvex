import { useState } from "react";
import { Link, useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { signInFormSchema } from "@kryvex/validation";
import { secureLogger } from "@kryvex/security";
import { useVault } from "@/providers/VaultProvider";

// Deliberately generic — never reveal whether the email or the password was
// wrong (see docs/CRYPTOGRAPHIC_ARCHITECTURE.md §4.1's email-enumeration note).
const GENERIC_ERROR = "Invalid email or password.";

export default function SignInScreen() {
  const { signIn } = useVault();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    const parsed = signInFormSchema.safeParse({ email, masterPassword });
    if (!parsed.success) {
      setError(GENERIC_ERROR);
      return;
    }
    setSubmitting(true);
    try {
      await signIn(parsed.data.email, parsed.data.masterPassword);
      router.replace("/");
    } catch {
      secureLogger.error("Sign-in failed", { email: parsed.data.email });
      setError(GENERIC_ERROR);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in to Kryvex</Text>

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
          {submitting ? "Signing in…" : "Sign in"}
        </Text>
      </TouchableOpacity>

      <Link href="/sign-up" style={styles.link}>
        Need a vault? Create one
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
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
