"use client";

import Link from "next/link";
import type { DecryptedVaultItem } from "@kryvex/vault";
import { CopyableTextField, SecretField } from "@kryvex/ui";
import { ItemCard } from "./ItemCard";

interface EmailDenseListProps {
  items: DecryptedVaultItem[];
  onToggleFavorite: (id: string) => void;
  clipboardClearSeconds?: number | undefined;
}

/**
 * Compact list view for the Email category — every item's Email/Password
 * shown inline with Copy/Reveal buttons, so the user doesn't have to click
 * into each item to find one. See (vault)/page.tsx's view toggle. Items
 * that failed to decrypt, or (defensively) aren't actually Email items,
 * fall back to the normal ItemCard row instead of being silently dropped.
 */
export function EmailDenseList({
  items,
  onToggleFavorite,
  clipboardClearSeconds,
}: EmailDenseListProps) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => {
        if (item.decryptFailed) {
          return (
            <ItemCard
              key={item.id}
              item={item}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          );
        }
        if (item.content.type !== "email") {
          return (
            <ItemCard
              key={item.id}
              item={item}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          );
        }
        const { content } = item;
        return (
          <li
            key={item.id}
            className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3"
          >
            <Link
              href={`/item/${item.id}`}
              className="truncate text-xs font-medium text-text-secondary hover:text-foreground"
            >
              {content.title}
            </Link>
            <CopyableTextField label="Email" value={content.email} readOnly />
            <SecretField
              label="Password"
              value={content.password}
              readOnly
              clipboardClearSeconds={clipboardClearSeconds}
            />
          </li>
        );
      })}
    </ul>
  );
}
