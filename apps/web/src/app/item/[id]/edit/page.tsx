"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import type { ItemContent } from "@kryvex/types";
import { ITEM_TYPE_LABELS, ItemForm } from "@kryvex/ui";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

export default function EditItemPage() {
  const { state, settings } = useVault();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { items, loading, updateItem } = useVaultItems();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "SIGNED_OUT") router.replace("/sign-in");
    if (state.status === "AUTHENTICATED_LOCKED") router.replace("/unlock");
  }, [state.status, router]);

  if (state.status !== "UNLOCKED" || loading) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  const item = items.find((i) => i.id === params.id);

  if (!item || item.decryptFailed) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-gray-500">
          {item
            ? "This item cannot be edited (unable to decrypt)."
            : "Item not found."}
        </p>
        <Link href="/" className="text-sm underline">
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
    <main className="flex min-h-screen flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">
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
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
