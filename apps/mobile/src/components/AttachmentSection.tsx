import { useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { bytesToBase64 } from "@kryvex/crypto";
import { secureLogger } from "@kryvex/security";
import { useAttachment } from "@/hooks/useAttachments";
import { shareDecryptedFile } from "@/lib/attachmentFiles";
import { formatBytes } from "./AttachmentFileField";
import { Button } from "./Button";

/**
 * RN counterpart of apps/web's AttachmentSection + packages/ui's
 * AttachmentPreview. Nothing is downloaded until the user taps.
 * - Images render inline from an in-memory data URI — never written to disk.
 * - Everything else goes to the system share sheet via a short-lived
 *   private temp file (see shareDecryptedFile).
 */
export function AttachmentSection({
  attachmentId,
  label,
}: {
  attachmentId: string;
  label?: string;
}) {
  const { metadata, loading, error, loadContent } = useAttachment(attachmentId);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isImage = metadata?.mimeType.startsWith("image/") ?? false;

  async function run(action: () => Promise<void>, failure: string) {
    setActionError(null);
    setBusy(true);
    try {
      await action();
    } catch {
      secureLogger.error(failure, { attachmentId });
      setActionError("Couldn't open this attachment. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleShow() {
    if (!metadata) return;
    void run(async () => {
      const bytes = await loadContent();
      setImageUri(`data:${metadata.mimeType};base64,${bytesToBase64(bytes)}`);
    }, "Attachment preview failed");
  }

  function handleShare() {
    if (!metadata) return;
    void run(async () => {
      const bytes = await loadContent();
      await shareDecryptedFile(bytes, metadata.fileName, metadata.mimeType);
    }, "Attachment share failed");
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      {loading ? (
        <Text style={styles.meta}>Loading…</Text>
      ) : error || !metadata ? (
        <Text style={styles.error}>
          {error ?? "Unable to load this attachment."}
        </Text>
      ) : (
        <>
          <Text style={styles.fileName} numberOfLines={2}>
            {metadata.fileName}
          </Text>
          <Text style={styles.meta}>
            {metadata.mimeType} · {formatBytes(metadata.sizeBytes)}
          </Text>
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="contain"
              accessibilityLabel={metadata.fileName}
              testID="attachment-image"
            />
          )}
          <View style={styles.actions}>
            {isImage &&
              (imageUri ? (
                <Button onPress={() => setImageUri(null)}>Hide</Button>
              ) : (
                <Button onPress={handleShow} disabled={busy}>
                  {busy ? "Decrypting…" : "Show"}
                </Button>
              ))}
            <Button onPress={handleShare} disabled={busy}>
              {busy ? "Decrypting…" : "Open / share"}
            </Button>
          </View>
          {actionError && <Text style={styles.error}>{actionError}</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
  },
  fileName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  meta: { fontSize: 12, color: "#6b7280" },
  image: { width: "100%", aspectRatio: 4 / 3, backgroundColor: "#f3f4f6" },
  actions: { flexDirection: "row", gap: 8 },
  error: { color: "#dc2626", fontSize: 13 },
});
