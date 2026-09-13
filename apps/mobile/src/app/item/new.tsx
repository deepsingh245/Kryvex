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
import { ItemForm } from "@/components/ItemForm";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

// image/pdf/file are excluded from the picker — attachment upload is
// Phase 6, same as web's item/new/page.tsx.
export default function NewItemScreen() {
  const { state } = useVault();
  const router = useRouter();
  const { createItem } = useVaultItems();
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
      <ItemForm
        type={selectedType}
        onSubmit={(content) => void handleSubmit(content)}
        onCancel={() => setSelectedType(null)}
        submitting={submitting}
      />
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
