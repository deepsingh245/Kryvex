import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import type { UserProfileSettings } from "@kryvex/types";
import { secureLogger } from "@kryvex/security";
import { Button } from "@/components/Button";
import { EmergencyKit } from "@/components/EmergencyKit";
import { hasBiometricEnrollment, isBiometricSupported } from "@/lib/biometric";
import { useVault } from "@/providers/VaultProvider";
import { DEFAULT_SETTINGS } from "@/providers/vaultSettings";

// Same option lists as apps/web's /settings.
const AUTO_LOCK_OPTIONS = [1, 5, 15, 30, 60];
const CLIPBOARD_CLEAR_OPTIONS = [10, 30, 60, 120];

function OptionRow({
  label,
  options,
  value,
  format,
  disabled,
  onSelect,
}: {
  label: string;
  options: number[];
  value: number;
  format: (n: number) => string;
  disabled: boolean;
  onSelect: (n: number) => void;
}) {
  return (
    <View style={styles.optionRow} accessibilityRole="radiogroup">
      {options.map((option) => {
        const selected = option === value;
        return (
          <TouchableOpacity
            key={option}
            style={[styles.option, selected && styles.optionSelected]}
            onPress={() => onSelect(option)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${label}: ${format(option)}`}
          >
            <Text
              style={[styles.optionText, selected && styles.optionTextSelected]}
            >
              {format(option)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const {
    state,
    settings,
    updateSettings,
    enableBiometric,
    disableBiometric,
    regenerateRecoveryKey,
  } = useVault();
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [masterPassword, setMasterPassword] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [newRecoveryKey, setNewRecoveryKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uid = state.status === "UNLOCKED" ? state.user.uid : null;
  const effective = settings ?? DEFAULT_SETTINGS;

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

  async function run(action: () => Promise<void>, failure: string) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      secureLogger.error(failure);
      setError(err instanceof Error ? err.message : failure);
    } finally {
      setBusy(false);
    }
  }

  function handleSetting(patch: Partial<UserProfileSettings>) {
    void run(() => updateSettings(patch), "Couldn't save settings.");
  }

  function handleEnable() {
    if (!masterPassword) {
      setError("Enter your master password.");
      return;
    }
    void run(async () => {
      await enableBiometric(masterPassword);
      setEnrolled(true);
      setMasterPassword("");
    }, "Couldn't enable fingerprint unlock.");
  }

  function handleDisable() {
    void run(async () => {
      await disableBiometric();
      setEnrolled(false);
    }, "Couldn't disable fingerprint unlock.");
  }

  function handleRegenerate() {
    if (!recoveryPassword) {
      setError("Enter your master password.");
      return;
    }
    void run(async () => {
      const { recoveryKey } = await regenerateRecoveryKey(recoveryPassword);
      setRecoveryPassword("");
      setNewRecoveryKey(recoveryKey);
    }, "Couldn't create a Recovery Key.");
  }

  if (newRecoveryKey) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <EmergencyKit
          recoveryKey={newRecoveryKey}
          onContinue={() => setNewRecoveryKey(null)}
        />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Settings</Text>

      <Text style={styles.label}>Auto-lock after inactivity</Text>
      <Text style={styles.hint}>
        Also applies while Kryvex is in the background.
      </Text>
      <OptionRow
        label="Auto-lock"
        options={AUTO_LOCK_OPTIONS}
        value={effective.autoLockMinutes}
        format={(m) => `${m} min`}
        disabled={busy}
        onSelect={(autoLockMinutes) => handleSetting({ autoLockMinutes })}
      />

      <Text style={styles.label}>Clear copied secrets after</Text>
      <OptionRow
        label="Clipboard clear"
        options={CLIPBOARD_CLEAR_OPTIONS}
        value={effective.clipboardClearSeconds}
        format={(s) => `${s}s`}
        disabled={busy}
        onSelect={(clipboardClearSeconds) =>
          handleSetting({ clipboardClearSeconds })
        }
      />

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
          <Button onPress={handleDisable} disabled={busy}>
            {busy ? "Working…" : "Disable fingerprint"}
          </Button>
        </>
      ) : (
        <>
          <Text style={styles.hint}>
            Confirm your master password, then approve the biometric prompt. The
            vault key stays protected by the device Keystore / Keychain.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Master password"
            secureTextEntry
            autoComplete="current-password"
            value={masterPassword}
            onChangeText={setMasterPassword}
            accessibilityLabel="Master password for fingerprint unlock"
          />
          <Button variant="primary" onPress={handleEnable} disabled={busy}>
            {busy ? "Working…" : "Enable fingerprint"}
          </Button>
        </>
      )}

      <Text style={styles.label}>Recovery Key</Text>
      <Text style={styles.hint}>
        Create a new Emergency Kit. If you already have one, it stops working —
        only the new key will recover your vault.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Master password"
        secureTextEntry
        autoComplete="current-password"
        value={recoveryPassword}
        onChangeText={setRecoveryPassword}
        accessibilityLabel="Master password for Recovery Key"
      />
      <Button onPress={handleRegenerate} disabled={busy}>
        {busy ? "Working…" : "Create new Recovery Key"}
      </Button>

      {error && <Text style={styles.error}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 8 },
  label: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  hint: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
  },
  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionSelected: { backgroundColor: "#111827", borderColor: "#111827" },
  optionText: { fontSize: 13, fontWeight: "600", color: "#111827" },
  optionTextSelected: { color: "white" },
  error: { color: "#dc2626", fontSize: 13 },
});
