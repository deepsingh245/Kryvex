"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import {
  AttachmentPreview,
  Badge,
  Button,
  buttonVariants,
  cn,
  Dialog,
  ITEM_TYPE_FIELD_CONFIG,
  ItemTypeBadge,
  SecretField,
} from "@kryvex/ui";
import { useAttachment } from "@/hooks/useAttachment";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

interface RecoveryCode {
  code: string;
  used: boolean;
}

function AttachmentSection({ attachmentId }: { attachmentId: string }) {
  const { metadata, loading, error, loadContent } = useAttachment(attachmentId);

  if (loading) return <p className="text-sm text-text-secondary">Loading…</p>;
  if (error || !metadata)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error ?? "Unable to load this attachment."}
      </p>
    );

  return (
    <AttachmentPreview
      fileName={metadata.fileName}
      mimeType={metadata.mimeType}
      sizeBytes={metadata.sizeBytes}
      onRequestContent={loadContent}
    />
  );
}

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

      {item.decryptFailed ? (
        <p role="alert" className="text-sm text-destructive">
          This item could not be decrypted. It may be corrupted or from an
          incompatible version.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {item.content.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.content.tags.map((tag) => (
                <Badge key={tag} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {(item.content.type === "image" ||
            item.content.type === "pdf" ||
            item.content.type === "file") && (
            <AttachmentSection attachmentId={item.content.attachmentId} />
          )}

          {/* Reuses ITEM_TYPE_FIELD_CONFIG (the same source that drives
              ItemForm) so the detail view and the edit form never disagree
              about field labels/kinds. Empty for image/pdf/file — see
              AttachmentSection above instead. */}
          {ITEM_TYPE_FIELD_CONFIG[item.type].map((field) => {
            const value = (item.content as unknown as Record<string, unknown>)[
              field.key
            ];
            if (value === undefined || value === "") return null;

            switch (field.kind) {
              case "secret":
                return (
                  <SecretField
                    key={field.key}
                    label={field.label}
                    value={String(value)}
                    readOnly
                    clipboardClearSeconds={settings?.clipboardClearSeconds}
                  />
                );
              case "multiUrl":
                return (
                  <p key={field.key} className="text-sm text-foreground">
                    <span className="text-text-secondary">{field.label}: </span>
                    {(value as string[]).join(", ")}
                  </p>
                );
              case "codeList":
                return (
                  <div key={field.key} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium text-foreground">
                      {field.label}
                    </span>
                    {(value as RecoveryCode[]).map((c, i) => (
                      <p key={i} className="font-mono text-text-secondary">
                        {c.code} {c.used ? "(used)" : ""}
                      </p>
                    ))}
                  </div>
                );
              case "multiline":
                return (
                  <p
                    key={field.key}
                    className="whitespace-pre-wrap text-sm text-foreground"
                  >
                    {String(value)}
                  </p>
                );
              case "boolean":
                return (
                  <p key={field.key} className="text-sm text-foreground">
                    <span className="text-text-secondary">{field.label}: </span>
                    {value ? "Yes" : "No"}
                  </p>
                );
              default:
                return (
                  <p key={field.key} className="text-sm text-foreground">
                    <span className="text-text-secondary">{field.label}: </span>
                    {String(value)}
                  </p>
                );
            }
          })}

          {item.content.notes && (
            <p className="whitespace-pre-wrap text-sm text-text-secondary">
              {item.content.notes}
            </p>
          )}

          {item.content.customFields.length > 0 && (
            <div className="flex flex-col gap-3">
              {item.content.customFields.map((field) =>
                field.type === "secret" || field.type === "totp" ? (
                  <SecretField
                    key={field.id}
                    label={field.label}
                    value={field.value}
                    readOnly
                    clipboardClearSeconds={settings?.clipboardClearSeconds}
                  />
                ) : (
                  <p key={field.id} className="text-sm text-foreground">
                    <span className="text-text-secondary">{field.label}: </span>
                    {field.value}
                  </p>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/item/${item.id}/edit`}
          className={buttonVariants({ variant: "secondary" })}
        >
          Edit
        </Link>
        <Button
          type="button"
          variant="destructive"
          onClick={() => setConfirmOpen(true)}
        >
          Delete
        </Button>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "ghost" }), "ml-auto")}
        >
          Back
        </Link>
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
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </Dialog>
    </main>
  );
}
