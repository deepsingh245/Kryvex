import { Link, Redirect } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { secureLogger } from "@kryvex/security";
import { useVaultItems, type ConflictResolution } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

/**
 * Sync conflict resolution — RN counterpart of
 * apps/web/src/app/conflicts/page.tsx. See docs/SYNC_ENGINE.md §7. Always
 * offers all three resolutions rather than trying to auto-detect
 * "unambiguous" merges — never silently loses data.
 */
export default function ConflictsScreen() {
  const { state } = useVault();
  const { conflicts, resolveConflict } = useVaultItems();

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

  async function handleResolve(itemId: string, resolution: ConflictResolution) {
    try {
      await resolveConflict(itemId, resolution);
    } catch {
      secureLogger.error("Failed to resolve conflict", { itemId });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Sync conflicts</Text>

      {conflicts.length === 0 && (
        <Text style={styles.hint}>No conflicts to review.</Text>
      )}

      {conflicts.map((conflict) => (
        <View key={conflict.itemId} style={styles.card}>
          <View style={styles.versionsRow}>
            <View style={styles.versionColumn}>
              <Text style={styles.versionLabel}>Your version</Text>
              <Text style={styles.versionTitle}>
                {conflict.localContent?.title ?? "Unable to decrypt"}
              </Text>
              {conflict.localContent?.notes && (
                <Text style={styles.versionNotes}>
                  {conflict.localContent.notes}
                </Text>
              )}
            </View>
            <View style={styles.versionColumn}>
              <Text style={styles.versionLabel}>Server version</Text>
              <Text style={styles.versionTitle}>
                {conflict.serverContent?.title ?? "Unable to decrypt"}
              </Text>
              {conflict.serverContent?.notes && (
                <Text style={styles.versionNotes}>
                  {conflict.serverContent.notes}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={() => void handleResolve(conflict.itemId, "keepMine")}
            >
              <Text style={styles.primaryActionText}>Keep mine</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => void handleResolve(conflict.itemId, "keepServer")}
            >
              <Text style={styles.actionButtonText}>Keep server&apos;s</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => void handleResolve(conflict.itemId, "keepBoth")}
            >
              <Text style={styles.actionButtonText}>Keep both</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <Link href="/" style={styles.link}>
        Back to vault
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { padding: 24, gap: 16 },
  title: { fontSize: 20, fontWeight: "600" },
  hint: { fontSize: 14, color: "#6b7280" },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
  },
  versionsRow: { flexDirection: "row", gap: 16 },
  versionColumn: { flex: 1, gap: 2 },
  versionLabel: { fontSize: 11, fontWeight: "600", color: "#6b7280" },
  versionTitle: { fontSize: 14, fontWeight: "500" },
  versionNotes: { fontSize: 12, color: "#6b7280" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actionButton: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  actionButtonText: { fontSize: 12, fontWeight: "600" },
  primaryAction: { backgroundColor: "#111827", borderColor: "#111827" },
  primaryActionText: { fontSize: 12, fontWeight: "600", color: "white" },
  link: { fontSize: 13, color: "#6b7280", textDecorationLine: "underline" },
});
