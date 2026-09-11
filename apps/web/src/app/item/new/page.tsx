"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import { ITEM_TYPES, type ItemContent, type ItemType } from "@kryvex/types";
import { ITEM_TYPE_ENABLED, ITEM_TYPE_LABELS, ItemForm } from "@kryvex/ui";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

// image/pdf/file are excluded from the picker — see @kryvex/ui/fieldConfig's
// ITEM_TYPE_ENABLED header comment: attachment upload is Phase 6.
export default function NewItemPage() {
  const { state } = useVault();
  const router = useRouter();
  const { createItem } = useVaultItems();
  const [selectedType, setSelectedType] = useState<ItemType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === "SIGNED_OUT") router.replace("/sign-in");
    if (state.status === "AUTHENTICATED_LOCKED") router.replace("/unlock");
  }, [state.status, router]);

  async function handleSubmit(content: ItemContent) {
    setError(null);
    setSubmitting(true);
    try {
      const id = await createItem(content.type, content);
      router.push(`/item/${id}`);
    } catch (err) {
      secureLogger.error("Failed to create item");
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  }

  if (state.status !== "UNLOCKED") {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  if (!selectedType) {
    return (
      <main className="flex min-h-screen flex-1 flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold">Add an item</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ITEM_TYPES.filter((type) => ITEM_TYPE_ENABLED[type]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedType(type)}
              className="rounded border p-4 text-left text-sm font-medium"
            >
              {ITEM_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
        <Link href="/" className="text-sm text-gray-500 underline">
          Cancel
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">
        Add {ITEM_TYPE_LABELS[selectedType]}
      </h1>
      <ItemForm
        type={selectedType}
        onSubmit={(content) => void handleSubmit(content)}
        onCancel={() => setSelectedType(null)}
        submitting={submitting}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </main>
  );
}
