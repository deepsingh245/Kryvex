import { useState } from "react";
import { Link, Redirect, useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { secureLogger } from "@kryvex/security";
import { ITEM_TYPE_FIELD_CONFIG } from "@kryvex/ui";
import { ItemTypeBadge } from "@/components/ItemTypeBadge";
import { SecretField } from "@/components/SecretField";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

interface RecoveryCode {
  code: string;
  used: boolean;
}

export default function ItemDetailScreen() {
  const { state } = useVault();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, loading, toggleFavorite, softDeleteItem } = useVaultItems();
  const [deleting, setDeleting] = useState(false);
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

  if (!item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>Item not found.</Text>
        <Link href="/" style={styles.link}>
          Back to vault
        </Link>
      </View>
    );
  }

  function handleDelete() {
    Alert.alert(
      "Delete this item?",
      "This cannot be undone from this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void performDelete(),
        },
      ],
    );
  }

  async function performDelete() {
    setDeleting(true);
    try {
      await softDeleteItem(item!.id);
      router.replace("/");
    } catch (err) {
      secureLogger.error("Failed to delete item");
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ItemTypeBadge type={item.type} />
          <Text style={styles.title}>
            {item.decryptFailed ? "Unable to decrypt" : item.content.title}
          </Text>
        </View>
        <TouchableOpacity onPress={() => void toggleFavorite(item.id)}>
          <Text style={styles.favoriteStar}>{item.favorite ? "★" : "☆"}</Text>
        </TouchableOpacity>
      </View>

      {item.decryptFailed ? (
        <Text style={styles.error}>
          This item could not be decrypted. It may be corrupted or from an
          incompatible version.
        </Text>
      ) : (
        <View style={styles.content}>
          {item.content.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.content.tags.map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {ITEM_TYPE_FIELD_CONFIG[item.type].map((field) => {
            const value = (item.content as unknown as Record<string, unknown>)[
              field.key
            ];
            if (value === undefined || value === "") return null;

            switch (field.kind) {
              case "secret":
                return (
                  <SecretField
                    key={field.key}
                    label={field.label}
                    value={String(value)}
                    readOnly
                  />
                );
              case "multiUrl":
                return (
                  <Text key={field.key} style={styles.fieldText}>
                    {field.label}: {(value as string[]).join(", ")}
                  </Text>
                );
              case "codeList":
                return (
                  <View key={field.key} style={{ gap: 4 }}>
                    <Text style={styles.fieldLabel}>{field.label}</Text>
                    {(value as RecoveryCode[]).map((c, i) => (
                      <Text key={i} style={styles.fieldText}>
                        {c.code} {c.used ? "(used)" : ""}
                      </Text>
                    ))}
                  </View>
                );
              case "boolean":
                return (
                  <Text key={field.key} style={styles.fieldText}>
                    {field.label}: {value ? "Yes" : "No"}
                  </Text>
                );
              default:
                return (
                  <Text key={field.key} style={styles.fieldText}>
                    {field.label}: {String(value)}
                  </Text>
                );
            }
          })}

          {item.content.notes && (
            <Text style={styles.notes}>{item.content.notes}</Text>
          )}

          {item.content.customFields.length > 0 && (
            <View style={{ gap: 6 }}>
              {item.content.customFields.map((field) =>
                field.type === "secret" || field.type === "totp" ? (
                  <SecretField
                    key={field.id}
                    label={field.label}
                    value={field.value}
                    readOnly
                  />
                ) : (
                  <Text key={field.id} style={styles.fieldText}>
                    {field.label}: {field.value}
                  </Text>
                ),
              )}
            </View>
          )}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <Link href={`/item/${item.id}/edit`} style={styles.actionButton}>
          Edit
        </Link>
        <TouchableOpacity onPress={handleDelete} disabled={deleting}>
          <Text style={[styles.actionButton, styles.deleteText]}>
            {deleting ? "Deleting…" : "Delete"}
          </Text>
        </TouchableOpacity>
        <Link href="/" style={styles.actionButton}>
          Back
        </Link>
      </View>
    </ScrollView>
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
  container: { padding: 16, gap: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontWeight: "600" },
  favoriteStar: { fontSize: 22 },
  content: { gap: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagChip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagChipText: { fontSize: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  fieldText: { fontSize: 14 },
  notes: { fontSize: 14, color: "#6b7280" },
  error: { color: "#dc2626", fontSize: 13 },
  actions: { flexDirection: "row", gap: 12, alignItems: "center" },
  actionButton: {
    fontSize: 14,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    overflow: "hidden",
  },
  deleteText: { color: "#dc2626", borderColor: "#dc2626" },
});
