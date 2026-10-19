import { StyleSheet, Text, View } from "react-native";
import { secureLogger } from "@kryvex/security";
import {
  AttachmentTooLargeError,
  pickFile,
  type PickedFile,
  type PickKind,
} from "@/lib/attachmentFiles";
import { Button } from "./Button";

const BUTTON_LABEL: Record<PickKind, string> = {
  image: "Choose photo",
  pdf: "Choose PDF",
  any: "Choose file",
};

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface AttachmentFileFieldProps {
  label: string;
  kinds: PickKind[];
  value: PickedFile | null;
  onChange: (file: PickedFile | null) => void;
  onError: (message: string | null) => void;
  disabled?: boolean | undefined;
}

/** Picks one file; hands the caller a PickedFile (never reads/uploads it). */
export function AttachmentFileField({
  label,
  kinds,
  value,
  onChange,
  onError,
  disabled,
}: AttachmentFileFieldProps) {
  async function handlePick(kind: PickKind) {
    onError(null);
    try {
      const picked = await pickFile(kind);
      if (picked) onChange(picked);
    } catch (err) {
      if (err instanceof AttachmentTooLargeError) {
        onError(err.message);
      } else {
        secureLogger.error("File picker failed");
        onError("Couldn't open that file.");
      }
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {value ? (
        <View style={styles.chosen}>
          <Text style={styles.fileName} numberOfLines={1}>
            {value.name}
          </Text>
          {value.size !== undefined && (
            <Text style={styles.meta}>{formatBytes(value.size)}</Text>
          )}
          <Button onPress={() => onChange(null)} disabled={disabled}>
            Remove
          </Button>
        </View>
      ) : (
        <View style={styles.buttons}>
          {kinds.map((kind) => (
            <Button
              key={kind}
              onPress={() => void handlePick(kind)}
              disabled={disabled}
            >
              {BUTTON_LABEL[kind]}
            </Button>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontWeight: "500" },
  buttons: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chosen: { flexDirection: "row", alignItems: "center", gap: 8 },
  fileName: { flex: 1, fontSize: 14, color: "#111827" },
  meta: { fontSize: 12, color: "#6b7280" },
});
