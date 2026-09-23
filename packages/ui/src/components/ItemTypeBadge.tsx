import {
  Code2,
  CreditCard,
  File,
  FileText,
  Grid3x3,
  IdCard,
  Image as ImageIcon,
  KeyRound,
  type LucideIcon,
  Mail,
  Shield,
  SlidersHorizontal,
  StickyNote,
  User,
} from "lucide-react";
import type { ItemType } from "@kryvex/types";
import { ITEM_TYPE_ICON_NAMES, ITEM_TYPE_LABELS } from "../fieldConfig";
import { Badge } from "./ui/badge";

// Maps fieldConfig's platform-agnostic ITEM_TYPE_ICON_NAMES keys to actual
// Lucide components — kept here (not in fieldConfig.ts) so that file stays
// importable by a future React Native UI without pulling in a web icon lib.
const ICON_BY_NAME: Record<string, LucideIcon> = {
  key: KeyRound,
  mail: Mail,
  note: StickyNote,
  user: User,
  "credit-card": CreditCard,
  grid: Grid3x3,
  code: Code2,
  shield: Shield,
  image: ImageIcon,
  "file-text": FileText,
  file: File,
  "id-card": IdCard,
  sliders: SlidersHorizontal,
};

// Exported so consumers needing a larger/standalone icon (e.g. apps/web's
// vault ItemCard) don't duplicate this lookup table.
export function getItemTypeIcon(type: ItemType): LucideIcon {
  return ICON_BY_NAME[ITEM_TYPE_ICON_NAMES[type]] ?? FileText;
}

export function ItemTypeBadge({ type }: { type: ItemType }) {
  const Icon = getItemTypeIcon(type);
  return (
    <Badge variant="neutral">
      {/* getItemTypeIcon is a pure lookup over a fixed set of module-level
          Lucide components (never creates one) — the disable is for the
          React Compiler's static analysis, which can't see that through
          the function call. */}
      {/* eslint-disable-next-line react-hooks/static-components */}
      <Icon className="h-3 w-3" strokeWidth={2} />
      {ITEM_TYPE_LABELS[type]}
    </Badge>
  );
}
