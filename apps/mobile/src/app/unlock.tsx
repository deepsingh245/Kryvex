import { useEffect, useState } from "react";
import { Link, Redirect, useRouter } from "expo-router";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { secureLogger } from "@kryvex/security";
import { hasBiometricEnrollment } from "@/lib/biometric";
import { useVault } from "@/providers/VaultProvider";

export default function UnlockScreen() {
  const { state, unlock, unlockWithBiometric } = useVault();
  const router = useRouter();
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [biometricEnrolled, setBiometricEnrolled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const uid =
    state.status === "AUTHENTICATED_LOCKED" || state.status === "UNLOCKING"
      ? state.user.uid
      : null;

  useEffect(() => {
    if (state.status === "UNLOCKED") router.replace("/");
  }, [state.status, router]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void hasBiometricEnrollment(uid).then((enrolled) => {
      if (!cancelled) setBiometricEnrolled(enrolled);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

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

  async function handleBiometric() {
    setError(null);
    setBiometricBusy(true);
    try {
      await unlockWithBiometric();
      router.replace("/");
    } catch {
      secureLogger.error("Biometric unlock failed");
      setError(
        "Fingerprint unlock failed. Use your master password, then enable it again in Settings if needed.",
      );
    } finally {
      setBiometricBusy(false);
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

      {biometricEnrolled && (
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={() => void handleBiometric()}
          disabled={biometricBusy || submitting}
        >
          <Text style={styles.biometricButtonText}>
            {biometricBusy ? "Waiting for fingerprint…" : "Use fingerprint"}
          </Text>
        </TouchableOpacity>
      )}

      <Link href="/recover" style={styles.link}>
        Forgot master password?
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
  biometricButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 12,
    alignItems: "center",
  },
  biometricButtonText: { color: "#111827", fontWeight: "600" },
  link: {
    textAlign: "center",
    color: "#6b7280",
    textDecorationLine: "underline",
  },
});
