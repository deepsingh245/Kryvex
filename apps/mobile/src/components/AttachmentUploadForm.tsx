import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { CustomField } from "@kryvex/types";
import type { PickedFile, PickKind } from "@/lib/attachmentFiles";
import { AttachmentFileField } from "./AttachmentFileField";
import { Button } from "./Button";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import { MultilineField } from "./MultilineField";
import { TagsInput } from "./TagsInput";
import { TextField } from "./TextField";

export type AttachmentFormType = "image" | "pdf" | "file" | "governmentId";

export interface AttachmentUploadFormValues {
  title: string;
  tags: string[];
  notes: string | undefined;
  customFields: CustomField[];
  /** The single file (image/pdf/file) or the front of a government ID. */
  file: PickedFile;
  /** Government ID only, optional. */
  backFile: PickedFile | undefined;
}

const KINDS: Record<AttachmentFormType, PickKind[]> = {
  image: ["image"],
  pdf: ["pdf"],
  file: ["image", "any"],
  governmentId: ["image", "pdf"],
};

/**
 * RN counterpart of packages/ui's AttachmentUploadForm +
 * GovernmentIdUploadForm. Stays free of crypto/Firebase — it only hands the
 * caller picked files; the caller encrypts and uploads.
 */
export function AttachmentUploadForm({
  type,
  onSubmit,
  onCancel,
  submitting,
}: {
  type: AttachmentFormType;
  onSubmit: (values: AttachmentUploadFormValues) => void;
  onCancel: () => void;
  submitting?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [file, setFile] = useState<PickedFile | null>(null);
  const [backFile, setBackFile] = useState<PickedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isGovernmentId = type === "governmentId";

  function handleSubmit() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!file) {
      setError(
        isGovernmentId ? "Choose the front of the ID." : "Choose a file.",
      );
      return;
    }
    setError(null);
    onSubmit({
      title: title.trim(),
      tags,
      notes: isGovernmentId && notes ? notes : undefined,
      customFields,
      file,
      backFile: isGovernmentId ? (backFile ?? undefined) : undefined,
    });
  }

  return (
    <ScrollView
      contentContainerStyle={styles.form}
      keyboardShouldPersistTaps="handled"
    >
      <TextField label="Title" value={title} onChange={setTitle} />
      <TagsInput
        label="Tags"
        values={tags}
        onChange={setTags}
        placeholder="Add a tag"
      />
      <AttachmentFileField
        label={isGovernmentId ? "Front" : "File"}
        kinds={KINDS[type]}
        value={file}
        onChange={setFile}
        onError={setError}
        disabled={submitting}
      />
      {isGovernmentId && (
        <>
          <AttachmentFileField
            label="Back (optional)"
            kinds={KINDS[type]}
            value={backFile}
            onChange={setBackFile}
            onError={setError}
            disabled={submitting}
          />
          <MultilineField
            label="Notes"
            value={notes}
            onChange={setNotes}
            rows={3}
          />
        </>
      )}
      <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />
      <Text style={styles.hint}>
        Files are encrypted on this phone before upload. Max 50 MB each.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Button variant="primary" onPress={handleSubmit} disabled={submitting}>
          {submitting ? "Encrypting & uploading…" : "Upload"}
        </Button>
        <Button onPress={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14, padding: 16 },
  hint: { fontSize: 12, color: "#6b7280" },
  error: { color: "#dc2626", fontSize: 13 },
  actions: { flexDirection: "row", gap: 8 },
});
