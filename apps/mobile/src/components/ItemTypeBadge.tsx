import { StyleSheet, Text, View } from "react-native";
import type { ItemType } from "@kryvex/types";
import { ITEM_TYPE_LABELS } from "@kryvex/ui";

export function ItemTypeBadge({ type }: { type: ItemType }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{ITEM_TYPE_LABELS[type]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#f3f4f6",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  text: { fontSize: 11, fontWeight: "600", color: "#374151" },
});
