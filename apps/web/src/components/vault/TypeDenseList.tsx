"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { ItemContent } from "@kryvex/types";
import type { DecryptedVaultItem } from "@kryvex/vault";
import {
  CopyableTextField,
  ITEM_TYPE_FIELD_CONFIG,
  ITEM_TYPE_LABELS,
  SecretField,
} from "@kryvex/ui";
import { ItemCard } from "./ItemCard";

interface TypeDenseListProps {
  items: DecryptedVaultItem[];
  onToggleFavorite: (id: string) => void;
  clipboardClearSeconds?: number | undefined;
}

// Attachment types have nothing copyable inline (the payload is a file), so
// they always fall back to the normal ItemCard row — per product decision the
// dense view covers every category except images/PDFs/files.
const ATTACHMENT_TYPES = new Set<string>(["image", "pdf", "file"]);

/**
 * Builds the inline Copy/Reveal rows for one item, driven by the same
 * ITEM_TYPE_FIELD_CONFIG that drives the generic ItemForm — so every type
 * (login, email, card, API key, PIN, …) gets a dense view without a bespoke
 * component per type. Returns [] when the item has nothing worth inlining,
 * in which case the caller falls back to ItemCard.
 */
function denseFields(
  content: ItemContent,
  clipboardClearSeconds: number | undefined,
): ReactNode[] {
  const record = content as unknown as Record<string, unknown>;
  const rows: ReactNode[] = [];

  for (const field of ITEM_TYPE_FIELD_CONFIG[content.type]) {
    const value = record[field.key];
    switch (field.kind) {
      // Multiline bodies (a secure note) are masked too: the dense view puts
      // every item on screen at once, so free text stays behind Reveal.
      case "multiline":
      case "secret":
        if (typeof value === "string" && value) {
          rows.push(
            <SecretField
              key={field.key}
              label={field.label}
              value={value}
              readOnly
              clipboardClearSeconds={clipboardClearSeconds}
            />,
          );
        }
        break;
      case "codeList": {
        const codes = Array.isArray(value) ? value : [];
        if (codes.length > 0) {
          rows.push(
            <p key={field.key} className="text-xs text-text-muted">
              {codes.length} {codes.length === 1 ? "code" : "codes"} — open the
              item to view
            </p>,
          );
        }
        break;
      }
      // Website lists aren't scan-and-copy material — the item page shows them.
      case "multiUrl":
      case "boolean":
        break;
      default:
        if (typeof value === "string" && value) {
          rows.push(
            <CopyableTextField
              key={field.key}
              label={field.label}
              value={value}
              readOnly
            />,
          );
        }
    }
  }

  for (const cf of content.customFields) {
    if (!cf.value) continue;
    if (cf.type === "secret" || cf.type === "totp" || cf.type === "multiline") {
      rows.push(
        <SecretField
          key={`cf-${cf.id}`}
          label={cf.label}
          value={cf.value}
          readOnly
          clipboardClearSeconds={clipboardClearSeconds}
        />,
      );
    } else if (cf.type === "boolean") {
      rows.push(
        <p key={`cf-${cf.id}`} className="text-xs text-text-secondary">
          {cf.label}: {cf.value === "true" ? "Yes" : "No"}
        </p>,
      );
    } else {
      rows.push(
        <CopyableTextField
          key={`cf-${cf.id}`}
          label={cf.label}
          value={cf.value}
          readOnly
        />,
      );
    }
  }

  return rows;
}

/**
 * Compact list view for any category — every item's key fields shown inline
 * with Copy/Reveal buttons, so the user doesn't have to click into each item
 * to find one. Replaces the old Login/Email-only dense lists; see
 * (vault)/page.tsx's view toggle. Items that failed to decrypt, attachment
 * items (image/pdf/file), and items with nothing to inline fall back to the
 * normal ItemCard row instead of being silently dropped.
 */
export function TypeDenseList({
  items,
  onToggleFavorite,
  clipboardClearSeconds,
}: TypeDenseListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        if (item.decryptFailed || ATTACHMENT_TYPES.has(item.type)) {
          return (
            <ItemCard
              key={item.id}
              item={item}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          );
        }
        const { content } = item;
        const rows = denseFields(content, clipboardClearSeconds);
        if (rows.length === 0) {
          return (
            <ItemCard
              key={item.id}
              item={item}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          );
        }
        return (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <Link
                href={`/item/${item.id}`}
                className="truncate text-xs font-medium text-text-secondary hover:text-foreground"
              >
                {content.title}
              </Link>
              <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                {ITEM_TYPE_LABELS[content.type]}
              </span>
            </div>
            {rows}
          </li>
        );
      })}
    </ul>
  );
}
