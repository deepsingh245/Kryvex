"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { secureLogger } from "@kryvex/security";
import { ITEM_TYPES, type ItemContent, type ItemType } from "@kryvex/types";
import {
  AttachmentUploadForm,
  getItemTypeIcon,
  GovernmentIdUploadForm,
  ITEM_TYPE_ENABLED,
  ITEM_TYPE_LABELS,
  ItemForm,
  type AttachmentUploadFormValues,
  type GovernmentIdUploadFormValues,
} from "@kryvex/ui";
import { useCreateAttachment } from "@/hooks/useCreateAttachment";
import { newItemId, useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

const ATTACHMENT_TYPES = new Set<ItemType>(["image", "pdf", "file"]);

function isAttachmentType(type: ItemType): type is "image" | "pdf" | "file" {
  return ATTACHMENT_TYPES.has(type);
}

// A concrete, enabled ItemType in the URL skips the picker entirely;
// "files" (the aggregate Image/PDF/File bucket) and anything else fall
// back to null, which still shows a picker (see NewItemPage below).
function initialTypeFromParam(param: string | null): ItemType | null {
  if (!param || param === "files") return null;
  return (ITEM_TYPES as readonly string[]).includes(param) &&
    ITEM_TYPE_ENABLED[param as ItemType]
    ? (param as ItemType)
    : null;
}

function TypeTile({
  type,
  onSelect,
}: {
  type: ItemType;
  onSelect: () => void;
}) {
  // See ItemCard.tsx for why this needs the disable — getItemTypeIcon is a
  // pure lookup over a fixed set of module-level Lucide components.
  const Icon = getItemTypeIcon(type);
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex flex-col items-center gap-2.5 rounded-lg border border-border bg-card p-5 text-center transition-colors hover:border-border-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2">
        {/* eslint-disable-next-line react-hooks/static-components */}
        <Icon className="h-4.5 w-4.5 text-primary" strokeWidth={1.75} />
      </span>
      <span className="text-sm font-medium text-foreground">
        {ITEM_TYPE_LABELS[type]}
      </span>
    </button>
  );
}

// Gating (SIGNED_OUT/AUTHENTICATED_LOCKED redirects) now lives once in
// ../../layout.tsx, shared by every route in this group.
export default function NewItemPage() {
  const { settings } = useVault();
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const { createItem } = useVaultItems();
  const createAttachment = useCreateAttachment();
  const [selectedType, setSelectedType] = useState<ItemType | null>(() =>
    initialTypeFromParam(typeParam),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only true when we skipped the picker via the URL — Cancel then needs
  // to return to where the user actually came from (the filtered
  // category), not fall back to a picker screen they never saw.
  const skippedPicker = initialTypeFromParam(typeParam) !== null;
  const backHref = typeParam ? `/?type=${typeParam}` : "/";

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

  async function handleAttachmentSubmit(
    type: "image" | "pdf" | "file",
    values: AttachmentUploadFormValues,
  ) {
    setError(null);
    setSubmitting(true);
    try {
      const id = newItemId();
      const attachmentId = await createAttachment(values.file, id);
      await createItem(
        type,
        {
          type,
          title: values.title,
          tags: values.tags,
          notes: values.notes,
          customFields: values.customFields,
          attachmentId,
        },
        [attachmentId],
        id,
      );
      router.push(`/item/${id}`);
    } catch (err) {
      secureLogger.error("Failed to create attachment item");
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGovernmentIdSubmit(
    values: GovernmentIdUploadFormValues,
  ) {
    setError(null);
    setSubmitting(true);
    try {
      const id = newItemId();
      const frontAttachmentId = await createAttachment(values.frontFile, id);
      const backAttachmentId = values.backFile
        ? await createAttachment(values.backFile, id)
        : undefined;
      const attachmentRefs = backAttachmentId
        ? [frontAttachmentId, backAttachmentId]
        : [frontAttachmentId];
      await createItem(
        "governmentId",
        {
          type: "governmentId",
          title: values.title,
          tags: values.tags,
          notes: values.notes,
          customFields: values.customFields,
          frontAttachmentId,
          backAttachmentId,
        },
        attachmentRefs,
        id,
      );
      router.push(`/item/${id}`);
    } catch (err) {
      secureLogger.error("Failed to create government ID item");
      setError(err instanceof Error ? err.message : "Failed to save item.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!selectedType) {
    // "files" is an aggregate category (Image/PDF/File), not one concrete
    // ItemType, so it can't skip the picker outright — it narrows the
    // tile grid down to just those 3 instead of every enabled type.
    const tileTypes: readonly ItemType[] =
      typeParam === "files"
        ? (["image", "pdf", "file"] as const)
        : ITEM_TYPES.filter((type) => ITEM_TYPE_ENABLED[type]);
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
        <h1 className="text-xl font-semibold text-foreground">Add an item</h1>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tileTypes.map((type) => (
            <TypeTile
              key={type}
              type={type}
              onSelect={() => setSelectedType(type)}
            />
          ))}
        </div>
        <Link
          href={backHref}
          className="text-sm text-text-secondary underline-offset-4 hover:text-foreground hover:underline"
        >
          Cancel
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8">
      <h1 className="text-xl font-semibold text-foreground">
        Add {ITEM_TYPE_LABELS[selectedType]}
      </h1>
      {isAttachmentType(selectedType) ? (
        <AttachmentUploadForm
          type={selectedType}
          onSubmit={(values) =>
            void handleAttachmentSubmit(selectedType, values)
          }
          onCancel={() =>
            skippedPicker ? router.push(backHref) : setSelectedType(null)
          }
          submitting={submitting}
        />
      ) : selectedType === "governmentId" ? (
        <GovernmentIdUploadForm
          onSubmit={(values) => void handleGovernmentIdSubmit(values)}
          onCancel={() =>
            skippedPicker ? router.push(backHref) : setSelectedType(null)
          }
          submitting={submitting}
        />
      ) : (
        <ItemForm
          type={selectedType}
          onSubmit={(content) => void handleSubmit(content)}
          onCancel={() =>
            skippedPicker ? router.push(backHref) : setSelectedType(null)
          }
          submitting={submitting}
          clipboardClearSeconds={settings?.clipboardClearSeconds}
        />
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </main>
  );
}
