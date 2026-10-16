import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { secureLogger } from "@kryvex/security";
import { Button } from "@/components/Button";
import { hasBiometricEnrollment, isBiometricSupported } from "@/lib/biometric";
import { useVault } from "@/providers/VaultProvider";

export default function SettingsScreen() {
  const { state, enableBiometric, disableBiometric } = useVault();
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = state.status === "UNLOCKED" ? state.user.uid : null;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    void Promise.all([
      isBiometricSupported(),
      hasBiometricEnrollment(uid),
    ]).then(([isSupported, isEnrolled]) => {
      if (!cancelled) {
        setSupported(isSupported);
        setEnrolled(isEnrolled);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  if (state.status === "SIGNED_OUT") return <Redirect href="/sign-in" />;
  if (state.status !== "UNLOCKED") return <Redirect href="/unlock" />;

  async function handleEnable() {
    if (!masterPassword) {
      setError("Enter your master password.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await enableBiometric(masterPassword);
      setEnrolled(true);
      setMasterPassword("");
    } catch (err) {
      secureLogger.error("Failed to enable biometric unlock");
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't enable fingerprint unlock.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setError(null);
    setBusy(true);
    try {
      await disableBiometric();
      setEnrolled(false);
    } catch (err) {
      secureLogger.error("Failed to disable biometric unlock");
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't disable fingerprint unlock.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.label}>Fingerprint unlock</Text>

      {!supported && !enrolled ? (
        <Text style={styles.hint}>
          A strong fingerprint or face unlock is not enrolled on this device.
          Your master password always works.
        </Text>
      ) : enrolled ? (
        <>
          <Text style={styles.hint}>
            Enabled on this phone. Signing out removes it.
          </Text>
          <Button onPress={() => void handleDisable()} disabled={busy}>
            {busy ? "Disabling…" : "Disable fingerprint"}
          </Button>
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            Confirm your master password, then approve the Android biometric
            prompt. The vault key stays protected by the device Keystore.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Master password"
            secureTextEntry
            autoComplete="current-password"
            value={masterPassword}
            onChangeText={setMasterPassword}
          />
          <Button
            variant="primary"
            onPress={() => void handleEnable()}
            disabled={busy}
          >
            {busy ? "Enabling…" : "Enable fingerprint"}
          </Button>
        </>
      )}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  label: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
  },
  error: { color: "#dc2626", fontSize: 13 },
});
