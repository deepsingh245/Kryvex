import { ITEM_TYPE_LABELS } from "@kryvex/ui";
import type { DecryptedVaultItem } from "@kryvex/vault";

/** Short secondary line shown under an item's title (never a secret). */
export function getItemSubtitle(item: DecryptedVaultItem): string {
  if (item.decryptFailed) return "Could not be decrypted";
  const { content } = item;
  if (content.type === "login") {
    return content.username || content.websites[0] || ITEM_TYPE_LABELS.login;
  }
  if (content.type === "email") return content.email;
  return ITEM_TYPE_LABELS[content.type];
}

/** Hostname of a login's first website, for the "Website" column. */
export function getItemHost(item: DecryptedVaultItem): string | null {
  if (item.decryptFailed || item.content.type !== "login") return null;
  const first = item.content.websites[0];
  if (!first) return null;
  try {
    return new URL(first.includes("://") ? first : `https://${first}`).hostname;
  } catch {
    return first;
  }
}

/** The value the quick "copy password" action copies, if the item has one. */
export function getCopyablePassword(item: DecryptedVaultItem): string | null {
  if (item.decryptFailed) return null;
  const { content } = item;
  if (content.type === "login" || content.type === "email") {
    return content.password || null;
  }
  return null;
}

/** The value the quick "copy username" action copies, if the item has one. */
export function getCopyableUsername(item: DecryptedVaultItem): string | null {
  if (item.decryptFailed) return null;
  const { content } = item;
  if (content.type === "login") return content.username || null;
  if (content.type === "email") return content.email || null;
  return null;
}

export function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (value && typeof value === "object") {
    const v = value as { toDate?: () => Date; seconds?: number };
    if (typeof v.toDate === "function") return v.toDate();
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
  }
  return null;
}

/** "5m ago" / "3d ago" / "Mar 4" — blank when the timestamp is unavailable. */
export function formatUpdated(
  value: unknown,
  now: number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return "";
  const diff = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
