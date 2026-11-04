"use client";

import { Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import { Button, buttonVariants, cn, Dialog, ItemTypeBadge } from "@kryvex/ui";
import { BackLink } from "@/components/layout/BackLink";
import { ItemDetailBody } from "@/components/vault/ItemDetailBody";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

// Gating (SIGNED_OUT/AUTHENTICATED_LOCKED redirects) now lives once in
// ../../layout.tsx, shared by every route in this group.
export default function ItemDetailPage() {
  const { settings } = useVault();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { items, loading, toggleFavorite, softDeleteItem } = useVaultItems();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-8">
        <p className="text-sm text-text-secondary">Loading…</p>
      </main>
    );
  }

  const item = items.find((i) => i.id === params.id);

  if (!item) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-text-secondary">Item not found.</p>
        <Link href="/" className="text-sm text-primary underline">
          Back to vault
        </Link>
      </main>
    );
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await softDeleteItem(item!.id);
      router.push("/");
    } catch (err) {
      secureLogger.error("Failed to delete item");
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    } finally {
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
      <BackLink href="/" label="Back to vault" />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ItemTypeBadge type={item.type} />
          <h1 className="truncate text-xl font-semibold text-foreground">
            {item.decryptFailed ? "Unable to decrypt" : item.content.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void toggleFavorite(item.id)}
          aria-label={item.favorite ? "Unfavorite" : "Favorite"}
          aria-pressed={item.favorite}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <Star
            className={cn("h-[18px] w-[18px]", item.favorite && "text-warning")}
            strokeWidth={1.75}
            fill={item.favorite ? "currentColor" : "none"}
          />
        </button>
      </div>

      <ItemDetailBody
        item={item}
        clipboardClearSeconds={settings?.clipboardClearSeconds}
      />

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-border pt-5 sm:flex sm:justify-end">
        <Link
          href={`/item/${item.id}/edit`}
          className={buttonVariants({ variant: "secondary" })}
        >
          <Pencil className="h-4 w-4" strokeWidth={1.75} />
          Edit
        </Link>
        <Button
          type="button"
          variant="secondary"
          className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive/10"
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          Delete
        </Button>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this item?"
        description="This cannot be undone from this device."
      >
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setConfirmOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={deleting}
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </main>
  );
}
