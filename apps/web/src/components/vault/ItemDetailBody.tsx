"use client";

import {
  AttachmentPreview,
  Badge,
  CopyableTextField,
  ITEM_TYPE_FIELD_CONFIG,
  SecretField,
} from "@kryvex/ui";
import type { DecryptedVaultItem } from "@kryvex/vault";
import { useAttachment } from "@/hooks/useAttachment";

interface RecoveryCode {
  code: string;
  used: boolean;
}

function AttachmentSection({
  attachmentId,
  label,
}: {
  attachmentId: string;
  label?: string;
}) {
  const { metadata, loading, error, loadContent } = useAttachment(attachmentId);

  const body = loading ? (
    <p className="text-sm text-text-secondary">Loading…</p>
  ) : error || !metadata ? (
    <p role="alert" className="text-sm text-destructive">
      {error ?? "Unable to load this attachment."}
    </p>
  ) : (
    <AttachmentPreview
      fileName={metadata.fileName}
      mimeType={metadata.mimeType}
      sizeBytes={metadata.sizeBytes}
      onRequestContent={loadContent}
    />
  );

  if (!label) return body;
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {label}
      </span>
      {body}
    </div>
  );
}

/**
 * The field-by-field body of an item (tags, attachments, typed fields, notes,
 * custom fields). Shared by the item detail page and the desktop dashboard's
 * detail pane so the two never disagree about what an item looks like.
 */
export function ItemDetailBody({
  item,
  clipboardClearSeconds,
}: {
  item: DecryptedVaultItem;
  clipboardClearSeconds?: number | undefined;
}) {
  if (item.decryptFailed) {
    return (
      <p role="alert" className="text-sm text-destructive">
        This item could not be decrypted. It may be corrupted or from an
        incompatible version.
      </p>
    );
  }

  return (
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

      {item.content.type === "governmentId" && (
        <div className="flex flex-col gap-4">
          <AttachmentSection
            label="Front"
            attachmentId={item.content.frontAttachmentId}
          />
          {item.content.backAttachmentId && (
            <AttachmentSection
              label="Back"
              attachmentId={item.content.backAttachmentId}
            />
          )}
        </div>
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
                clipboardClearSeconds={clipboardClearSeconds}
              />
            );
          case "copyText":
            return (
              <CopyableTextField
                key={field.key}
                label={field.label}
                value={String(value)}
                readOnly
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
                clipboardClearSeconds={clipboardClearSeconds}
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
  );
}
