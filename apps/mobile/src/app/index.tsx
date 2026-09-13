import { useMemo, useState } from "react";
import { Link, Redirect, useRouter } from "expo-router";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KRYVEX_BRAND_COLOR } from "@kryvex/ui";
import { selectVisibleItems, type DecryptedVaultItem } from "@kryvex/vault";
import { ItemTypeBadge } from "@/components/ItemTypeBadge";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

/**
 * Vault Home — RN counterpart of apps/web/src/app/page.tsx. Same
 * selectVisibleItems-driven search/tag/favorites filtering over the
 * already-decrypted item list.
 */
export default function HomeScreen() {
  const { state, signOut } = useVault();
  const router = useRouter();
  const { items, loading, toggleFavorite } = useVaultItems();
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const visible = useMemo(
    () => selectVisibleItems({ items }, { query, tagFilter, favoritesOnly }),
    [items, query, tagFilter, favoritesOnly],
  );

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const item of items) {
      if (!item.decryptFailed) {
        for (const tag of item.content.tags) tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }, [items]);

  if (state.status === "SIGNED_OUT") return <Redirect href="/sign-in" />;
  if (state.status === "AUTHENTICATED_LOCKED")
    return <Redirect href="/unlock" />;

  if (state.status === "UNLOCKED") {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: KRYVEX_BRAND_COLOR }]}>
            Your vault
          </Text>
          <View style={styles.headerActions}>
            <Link href="/generator" style={styles.headerLink}>
              Generator
            </Link>
            <Link href="/item/new" style={styles.headerLink}>
              + Add
            </Link>
            <TouchableOpacity onPress={() => void signOut()}>
              <Text style={styles.headerLink}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={styles.search}
          placeholder="Search"
          value={query}
          onChangeText={setQuery}
        />

        <TouchableOpacity
          style={styles.favoritesToggle}
          onPress={() => setFavoritesOnly((f) => !f)}
        >
          <Text style={styles.favoritesToggleText}>
            {favoritesOnly ? "★ Favorites only" : "☆ Favorites only"}
          </Text>
        </TouchableOpacity>

        {allTags.length > 0 && (
          <FlatList
            horizontal
            data={allTags}
            keyExtractor={(tag) => tag}
            showsHorizontalScrollIndicator={false}
            style={styles.tagRow}
            renderItem={({ item: tag }) => (
              <TouchableOpacity
                style={[
                  styles.tagChip,
                  tagFilter === tag && styles.tagChipSelected,
                ]}
                onPress={() =>
                  setTagFilter((current) => (current === tag ? undefined : tag))
                }
              >
                <Text
                  style={[
                    styles.tagChipText,
                    tagFilter === tag && styles.tagChipTextSelected,
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            )}
          />
        )}

        {loading && <Text style={styles.hint}>Loading…</Text>}

        {!loading && visible.length === 0 && (
          <Text style={styles.hint}>
            {items.length === 0
              ? "Your vault is empty."
              : "No items match your search."}
          </Text>
        )}

        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          renderItem={({ item }: { item: DecryptedVaultItem }) => (
            <View style={styles.itemRow}>
              {/* TouchableOpacity + router.push, not <Link>: Link's default
                  children render as RN Text, which can't contain a View
                  (ItemTypeBadge) as a child. */}
              <TouchableOpacity
                style={styles.itemLink}
                onPress={() => router.push(`/item/${item.id}`)}
              >
                <View style={styles.itemLinkContent}>
                  <ItemTypeBadge type={item.type} />
                  <Text style={styles.itemTitle}>
                    {item.decryptFailed
                      ? "Unable to decrypt"
                      : item.content.title}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => void toggleFavorite(item.id)}>
                <Text style={styles.favoriteStar}>
                  {item.favorite ? "★" : "☆"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    );
  }

  // UNLOCKING / LOCKING
  return (
    <View style={styles.container}>
      <Text style={styles.hint}>Loading…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "600" },
  headerActions: { flexDirection: "row", gap: 12 },
  headerLink: { fontSize: 13, fontWeight: "600", color: "#111827" },
  search: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    padding: 10,
  },
  favoritesToggle: { alignSelf: "flex-start" },
  favoritesToggleText: { fontSize: 13 },
  tagRow: { flexGrow: 0 },
  tagChip: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
  },
  tagChipSelected: { backgroundColor: "#111827", borderColor: "#111827" },
  tagChipText: { fontSize: 12 },
  tagChipTextSelected: { color: "white" },
  hint: { fontSize: 14, color: "#6b7280" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  itemLink: { flex: 1 },
  itemLinkContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemTitle: { fontSize: 14, fontWeight: "500" },
  favoriteStar: { fontSize: 18 },
});
