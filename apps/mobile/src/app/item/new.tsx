import { useState } from "react";
import { Link, Redirect, useRouter } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { secureLogger } from "@kryvex/security";
import { ITEM_TYPES, type ItemContent, type ItemType } from "@kryvex/types";
import { ITEM_TYPE_ENABLED, ITEM_TYPE_LABELS } from "@kryvex/ui";
import {
  AttachmentUploadForm,
  type AttachmentFormType,
  type AttachmentUploadFormValues,
} from "@/components/AttachmentUploadForm";
import { ItemForm } from "@/components/ItemForm";
import { useCreateAttachment } from "@/hooks/useAttachments";
import { newItemId, useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

// Types whose content is (or includes) an uploaded file get the dedicated
// upload form instead of the generic ItemForm — same split as web's
// item/new/page.tsx.
const ATTACHMENT_FORM_TYPES: ReadonlySet<ItemType> = new Set([
  "image",
  "pdf",
  "file",
  "governmentId",
]);

function isAttachmentFormType(type: ItemType): type is AttachmentFormType {
  return ATTACHMENT_FORM_TYPES.has(type);
}

export default function NewItemScreen() {
  const { state } = useVault();
  const router = useRouter();
  const { createItem } = useVaultItems();
  const createAttachment = useCreateAttachment();
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === "SIGNED_OUT") return <Redirect href="/sign-in" />;
  if (state.status === "AUTHENTICATED_LOCKED")
    return <Redirect href="/unlock" />;
  if (state.status !== "UNLOCKED") {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Loading…</Text>
      </View>
    );
  }

  async function handleSubmit(content: ItemContent) {
    setError(null);
    setSubmitting(true);
    try {
      const id = await createItem(content.type, content);
      router.replace(`/item/${id}`);
    } catch (err) {
      secureLogger.error("Failed to create item");
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  }

  // The item id is decided first so each AttachmentDocument.itemId can point
  // back at it. Uploads happen before the item write; a failure partway
  // leaves an orphaned attachment doc/blob (same as web — no rollback yet).
  async function handleAttachmentSubmit(
    type: AttachmentFormType,
    values: AttachmentUploadFormValues,
  ) {
    setError(null);
    setSubmitting(true);
    try {
      const id = newItemId();
      const base = {
        title: values.title,
        tags: values.tags,
        notes: values.notes,
        customFields: values.customFields,
      };
      if (type === "governmentId") {
        const frontAttachmentId = await createAttachment(values.file, id);
        const backAttachmentId = values.backFile
          ? await createAttachment(values.backFile, id)
          : undefined;
        await createItem(
          type,
          { ...base, type, frontAttachmentId, backAttachmentId },
          backAttachmentId
            ? [frontAttachmentId, backAttachmentId]
            : [frontAttachmentId],
          id,
        );
      } else {
        const attachmentId = await createAttachment(values.file, id);
        await createItem(
          type,
          { ...base, type, attachmentId },
          [attachmentId],
          id,
        );
      }
      router.replace(`/item/${id}`);
    } catch (err) {
      secureLogger.error("Failed to create attachment item");
      setError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!selectedType) {
    return (
      <ScrollView contentContainerStyle={styles.pickerContainer}>
        <Text style={styles.title}>Add an item</Text>
        <View style={styles.grid}>
          {ITEM_TYPES.filter((type) => ITEM_TYPE_ENABLED[type]).map((type) => (
            <TouchableOpacity
              key={type}
              style={styles.typeCard}
              onPress={() => setSelectedType(type)}
            >
              <Text style={styles.typeCardText}>{ITEM_TYPE_LABELS[type]}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Link href="/" style={styles.cancelLink}>
          Cancel
        </Link>
      </ScrollView>
    );
  }

  return (
    <View style={styles.formContainer}>
      <Text style={styles.title}>Add {ITEM_TYPE_LABELS[selectedType]}</Text>
      {isAttachmentFormType(selectedType) ? (
        <AttachmentUploadForm
          type={selectedType}
          onSubmit={(values) =>
            void handleAttachmentSubmit(selectedType, values)
          }
          onCancel={() => setSelectedType(null)}
          submitting={submitting}
        />
      ) : (
        <ItemForm
          type={selectedType}
          onSubmit={(content) => void handleSubmit(content)}
          onCancel={() => setSelectedType(null)}
          submitting={submitting}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: { fontSize: 14, color: "#6b7280" },
  pickerContainer: { flexGrow: 1, padding: 24, gap: 16 },
  formContainer: { flex: 1, padding: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  typeCard: {
    width: "47%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 16,
  },
  typeCardText: { fontSize: 14, fontWeight: "600" },
  cancelLink: {
    fontSize: 13,
    color: "#6b7280",
    textDecorationLine: "underline",
  },
  error: { color: "#dc2626", fontSize: 13, paddingHorizontal: 16 },
});
