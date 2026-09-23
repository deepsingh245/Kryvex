"use client";

import { Plus } from "lucide-react";
import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import type { CustomField } from "@kryvex/types";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import { Label } from "./ui/label";
import { TagsInput } from "./TagsInput";
import { TextField } from "./TextField";
import { Button } from "./ui/button";

// Matches firebase/storage.rules' upload size cap exactly.
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

const ACCEPT_BY_TYPE: Record<"image" | "pdf" | "file", string | undefined> = {
  image: "image/*",
  pdf: "application/pdf",
  file: undefined,
};

export interface AttachmentUploadFormValues {
  title: string;
  tags: string[];
  // No Notes field in this form (removed per product feedback — Custom
  // Fields' multiline option already covers free text) — always undefined.
  // Kept in the shape rather than removed outright since it flows straight
  // into ItemContentBase.notes, which stays optional.
  notes: string | undefined;
  customFields: CustomField[];
  file: File;
}

export interface AttachmentUploadFormProps {
  type: "image" | "pdf" | "file";
  onSubmit: (values: AttachmentUploadFormValues) => void;
  onCancel: () => void;
  submitting?: boolean;
}

/**
 * Dedicated Add-flow form for Image/PDF/File items — deliberately separate
 * from the generic ItemForm (see ../fieldConfig.ts's header comment):
 * picking/encrypting/uploading a file is an async, bespoke sequence the
 * caller owns, unlike ItemForm's synchronous "assemble ItemContent" submit
 * contract. This component itself stays free of crypto/Firebase — it only
 * ever hands the caller a raw `File`.
 */
export function AttachmentUploadForm({
  type,
  onSubmit,
  onCancel,
  submitting,
}: AttachmentUploadFormProps) {
  const fileInputId = useId();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Always starts empty (this form has no initialContent) — collapsed
  // behind a button, same as ItemForm.tsx.
  const [showTags, setShowTags] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > MAX_ATTACHMENT_BYTES) {
      setError(
        `That file is too large (max ${Math.floor(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB).`,
      );
      setFile(null);
      return;
    }
    setError(null);
    setFile(selected);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setError(null);
    onSubmit({
      title,
      tags,
      notes: undefined,
      customFields,
      file,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <TextField label="Title" value={title} required onChange={setTitle} />
      {showTags ? (
        <TagsInput
          label="Tags"
          values={tags}
          onChange={setTags}
          placeholder="Add a tag and press Enter"
        />
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => setShowTags(true)}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Add tags
        </Button>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={fileInputId}>File</Label>
        <input
          id={fileInputId}
          type="file"
          accept={ACCEPT_BY_TYPE[type]}
          onChange={handleFileChange}
          className="flex h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface text-sm text-foreground shadow-sm outline-none file:mr-3 file:h-11 file:cursor-pointer file:border-0 file:border-r file:border-border file:bg-surface-2 file:px-3.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      {showCustomFields ? (
        <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />
      ) : (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="self-start"
          onClick={() => setShowCustomFields(true)}
        >
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          Add custom field
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Uploading…" : "Upload"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
