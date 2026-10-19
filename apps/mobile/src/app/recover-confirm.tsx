import { useState } from "react";
import { Link, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { secureLogger } from "@kryvex/security";
import { masterPasswordSchema } from "@kryvex/validation";
import { Button } from "@/components/Button";
import { EmergencyKit } from "@/components/EmergencyKit";
import { parseOobCode } from "@/lib/recoveryLink";
import { useVault } from "@/providers/VaultProvider";

/**
 * Step 2 of docs/RECOVERY.md §3, on-device: the pasted email link (proof of
 * inbox control) + the Recovery Key (proof of kit possession) + a new master
 * password. Mirrors apps/web's /recover/confirm.
 */
export default function RecoverConfirmScreen() {
  const { recoverVault } = useVault();
  const router = useRouter();
  const [linkInput, setLinkInput] = useState("");
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [newMasterPassword, setNewMasterPassword] = useState("");
  const [confirmMasterPassword, setConfirmMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    const oobCode = parseOobCode(linkInput);
    if (!oobCode) {
      setError("Paste the full link from the recovery email.");
      return;
    }
    if (!recoveryKeyInput.trim()) {
      setError("Enter your Recovery Key.");
      return;
    }
    const parsedPassword = masterPasswordSchema.safeParse(newMasterPassword);
    if (!parsedPassword.success) {
      setError(parsedPassword.error.issues[0]?.message ?? "Invalid password.");
      return;
    }
    if (newMasterPassword !== confirmMasterPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const { recoveryKey } = await recoverVault(
        oobCode,
        recoveryKeyInput,
        newMasterPassword,
      );
      setRecoveryKeyInput("");
      setNewMasterPassword("");
      setConfirmMasterPassword("");
      setNewRecoveryKey(recoveryKey);
    } catch (err) {
      secureLogger.error("Vault recovery failed");
      setError(
        err instanceof Error
          ? err.message
          : "Recovery failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (newRecoveryKey) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hint}>
          Your vault is recovered. Your old Emergency Kit no longer works — save
          this new one.
        </Text>
        <EmergencyKit
          recoveryKey={newRecoveryKey}
          onContinue={() => router.replace("/")}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Reset with your Recovery Key</Text>
      <TextInput
        style={styles.input}
        placeholder="Recovery email link"
        autoCapitalize="none"
        autoCorrect={false}
        value={linkInput}
        onChangeText={setLinkInput}
        accessibilityLabel="Recovery email link"
      />
      <TextInput
        style={[styles.input, styles.mono]}
        placeholder="Recovery Key"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        value={recoveryKeyInput}
        onChangeText={setRecoveryKeyInput}
        accessibilityLabel="Recovery Key"
      />
      <TextInput
        style={styles.input}
        placeholder="New master password"
        secureTextEntry
        autoComplete="new-password"
        value={newMasterPassword}
        onChangeText={setNewMasterPassword}
        accessibilityLabel="New master password"
      />
      <TextInput
        style={styles.input}
        placeholder="Confirm new master password"
        secureTextEntry
        autoComplete="new-password"
        value={confirmMasterPassword}
        onChangeText={setConfirmMasterPassword}
        accessibilityLabel="Confirm new master password"
      />

      {error && <Text style={styles.error}>{error}</Text>}

      <Button
        variant="primary"
        onPress={() => void handleSubmit()}
        disabled={submitting}
      >
        {submitting ? "Recovering…" : "Recover vault"}
      </Button>
      <Link href="/sign-in" style={styles.link}>
        Back to sign in
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  hint: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
  },
  mono: { fontFamily: "monospace" },
  error: { color: "#dc2626", fontSize: 13 },
  link: {
    textAlign: "center",
    color: "#6b7280",
    textDecorationLine: "underline",
  },
});
