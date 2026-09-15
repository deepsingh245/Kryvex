"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import type { ItemContent } from "@kryvex/types";
import { ITEM_TYPE_LABELS, ItemForm } from "@kryvex/ui";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

// Gating (SIGNED_OUT/AUTHENTICATED_LOCKED redirects) now lives once in
// ../../layout.tsx, shared by every route in this group.
export default function EditItemPage() {
  const { settings } = useVault();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { items, loading, updateItem } = useVaultItems();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-text-secondary">Loading…</p>
      </main>
    );
  }

  const item = items.find((i) => i.id === params.id);

  if (!item || item.decryptFailed) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-text-secondary">
          {item
            ? "This item cannot be edited (unable to decrypt)."
            : "Item not found."}
        </p>
        <Link href="/" className="text-sm text-primary underline">
          Back to vault
        </Link>
      </main>
    );
  }

  async function handleSubmit(content: ItemContent) {
    setError(null);
    setSubmitting(true);
    try {
      await updateItem(item!.id, content);
      router.push(`/item/${item!.id}`);
    } catch (err) {
      secureLogger.error("Failed to update item");
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-xl font-semibold text-foreground">
        Edit {ITEM_TYPE_LABELS[item.type]}
      </h1>
      <ItemForm
        type={item.type}
        initialContent={item.content}
        onSubmit={(content) => void handleSubmit(content)}
        onCancel={() => router.push(`/item/${item.id}`)}
        submitting={submitting}
        clipboardClearSeconds={settings?.clipboardClearSeconds}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </main>
  );
}
