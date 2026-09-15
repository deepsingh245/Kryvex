"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import {
  AttachmentPreview,
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

  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (error || !metadata)
    return (
      <p role="alert" className="text-sm text-red-600">
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

export default function ItemDetailPage() {
  const { state, settings } = useVault();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { items, loading, toggleFavorite, softDeleteItem } = useVaultItems();
  const [deleting, setDeleting] = useState(false);
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

  if (!item) {
    return (
      <main className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="text-sm text-gray-500">Item not found.</p>
        <Link href="/" className="text-sm underline">
          Back to vault
        </Link>
      </main>
    );
  }

  async function handleDelete() {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Delete this item? This cannot be undone from this device.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await softDeleteItem(item!.id);
      router.push("/");
    } catch (err) {
      secureLogger.error("Failed to delete item");
      setError(err instanceof Error ? err.message : "Failed to delete item.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 flex-col gap-4 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ItemTypeBadge type={item.type} />
          <h1 className="text-xl font-semibold">
            {item.decryptFailed ? "Unable to decrypt" : item.content.title}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void toggleFavorite(item.id)}
          aria-label={item.favorite ? "Unfavorite" : "Favorite"}
          className="text-lg"
        >
          {item.favorite ? "★" : "☆"}
        </button>
      </div>

      {item.decryptFailed ? (
        <p className="text-sm text-red-600">
          This item could not be decrypted. It may be corrupted or from an
          incompatible version.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {item.content.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {item.content.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-3 py-1 text-xs"
                >
                  {tag}
                </span>
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
                  <p key={field.key} className="text-sm">
                    {field.label}: {(value as string[]).join(", ")}
                  </p>
                );
              case "codeList":
                return (
                  <div key={field.key} className="flex flex-col gap-1 text-sm">
                    <span className="font-medium">{field.label}</span>
                    {(value as RecoveryCode[]).map((c, i) => (
                      <p key={i}>
                        {c.code} {c.used ? "(used)" : ""}
                      </p>
                    ))}
                  </div>
                );
              case "multiline":
                return (
                  <p key={field.key} className="whitespace-pre-wrap text-sm">
                    {String(value)}
                  </p>
                );
              case "boolean":
                return (
                  <p key={field.key} className="text-sm">
                    {field.label}: {value ? "Yes" : "No"}
                  </p>
                );
              default:
                return (
                  <p key={field.key} className="text-sm">
                    {field.label}: {String(value)}
                  </p>
                );
            }
          })}

          {item.content.notes && (
            <p className="whitespace-pre-wrap text-sm text-gray-500">
              {item.content.notes}
            </p>
          )}

          {item.content.customFields.length > 0 && (
            <div className="flex flex-col gap-2">
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
                  <p key={field.id} className="text-sm">
                    {field.label}: {field.value}
                  </p>
                ),
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/item/${item.id}/edit`}
          className="rounded border px-4 py-2 text-sm font-medium"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="rounded border border-red-600 px-4 py-2 text-sm font-medium text-red-600 disabled:opacity-50"
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
        <Link
          href="/"
          className="ml-auto rounded border px-4 py-2 text-sm font-medium"
        >
          Back
        </Link>
      </div>
    </main>
  );
}
