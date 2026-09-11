import type { ItemType } from "@kryvex/types";
import { ITEM_TYPE_LABELS } from "../fieldConfig";

export function ItemTypeBadge({ type }: { type: ItemType }) {
  return (
    <span className="inline-block rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
      {ITEM_TYPE_LABELS[type]}
    </span>
  );
}
