import { useState } from "react";
import { Share, StyleSheet, Switch, Text, View } from "react-native";
import { copySecret } from "@/lib/clipboard";
import { useEffectiveSettings } from "@/providers/vaultSettings";
import { Button } from "./Button";

export interface EmergencyKitProps {
  recoveryKey: string;
  onContinue: () => void;
}

const ACKNOWLEDGMENT_TEXT =
  "If you lose both your master password and your Emergency Kit, Kryvex cannot recover your vault. There is no backdoor — that's what makes your data private.";

function kitText(recoveryKey: string): string {
  return [
    "Kryvex Emergency Kit",
    "",
    "This is your Recovery Key. It does not contain your master password,",
    "item content, or anything else — only this key.",
    "",
    recoveryKey,
    "",
    "Keep this somewhere safe. Anyone who has this key AND access to your",
    "email can recover your vault if you forget your master password.",
  ].join("\n");
}

/**
 * RN counterpart of packages/ui's EmergencyKit. Shown exactly once — at
 * sign-up, after recovery, or after creating/replacing the key in Settings
 * (docs/RECOVERY.md §2-3). "Save / share" uses the system share sheet, so
 * the user decides where the kit goes; nothing is written to app storage.
 */
export function EmergencyKit({ recoveryKey, onContinue }: EmergencyKitProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const { clipboardClearSeconds } = useEffectiveSettings();

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Your Emergency Kit
      </Text>
      <Text style={styles.hint}>
        This Recovery Key is the only way to get back into your vault if you
        forget your master password. It will not be shown again.
      </Text>

      <Text style={styles.key} selectable testID="recovery-key">
        {recoveryKey}
      </Text>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            onPress={() =>
              void copySecret(recoveryKey, clipboardClearSeconds).catch(
                () => undefined,
              )
            }
          >
            Copy
          </Button>
        </View>
        <View style={styles.flex}>
          <Button
            onPress={() =>
              void Share.share({ message: kitText(recoveryKey) }).catch(
                () => undefined,
              )
            }
          >
            Save / share
          </Button>
        </View>
      </View>
      <Text style={styles.warning}>
        Only share it somewhere private — a password manager, a printout, or an
        encrypted note. Copied keys are cleared from the clipboard after{" "}
        {clipboardClearSeconds}s.
      </Text>

      <View style={styles.ackRow}>
        <Switch
          value={acknowledged}
          onValueChange={setAcknowledged}
          accessibilityLabel="I understand"
          testID="kit-acknowledge"
        />
        <Text style={styles.ackText}>{ACKNOWLEDGMENT_TEXT}</Text>
      </View>

      <Button variant="primary" disabled={!acknowledged} onPress={onContinue}>
        Continue
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  title: { fontSize: 20, fontWeight: "600" },
  hint: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  key: {
    fontFamily: "monospace",
    fontSize: 15,
    lineHeight: 22,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    backgroundColor: "#f9fafb",
    padding: 12,
  },
  row: { flexDirection: "row", gap: 8 },
  flex: { flex: 1 },
  warning: { fontSize: 12, color: "#6b7280" },
  ackRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  ackText: { flex: 1, fontSize: 13, color: "#374151", lineHeight: 18 },
});
