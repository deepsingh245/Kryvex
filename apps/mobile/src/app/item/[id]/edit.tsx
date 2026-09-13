import { useState } from "react";
import { Link, Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { secureLogger } from "@kryvex/security";
import type { ItemContent } from "@kryvex/types";
import { ITEM_TYPE_LABELS } from "@kryvex/ui";
import { ItemForm } from "@/components/ItemForm";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

export default function EditItemScreen() {
  const { state } = useVault();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, loading, updateItem } = useVaultItems();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status === "SIGNED_OUT") return <Redirect href="/sign-in" />;
  if (state.status === "AUTHENTICATED_LOCKED")
    return <Redirect href="/unlock" />;

  if (state.status !== "UNLOCKED" || loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Loading…</Text>
      </View>
    );
  }

  const item = items.find((i) => i.id === id);

  if (!item || item.decryptFailed) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>
          {item
            ? "This item cannot be edited (unable to decrypt)."
            : "Item not found."}
        </Text>
        <Link href="/" style={styles.link}>
          Back to vault
        </Link>
      </View>
    );
  }

  async function handleSubmit(content: ItemContent) {
    setError(null);
    setSubmitting(true);
    try {
      await updateItem(item!.id, content);
      router.replace(`/item/${item!.id}`);
    } catch (err) {
      secureLogger.error("Failed to update item");
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit {ITEM_TYPE_LABELS[item.type]}</Text>
      <ItemForm
        type={item.type}
        initialContent={item.content}
        onSubmit={(content) => void handleSubmit(content)}
        onCancel={() => router.replace(`/item/${item.id}`)}
        submitting={submitting}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  hint: { fontSize: 14, color: "#6b7280" },
  link: { fontSize: 13, textDecorationLine: "underline" },
  container: { flex: 1, paddingTop: 16, gap: 8 },
  title: { fontSize: 20, fontWeight: "600", paddingHorizontal: 16 },
  error: { color: "#dc2626", fontSize: 13, paddingHorizontal: 16 },
});
