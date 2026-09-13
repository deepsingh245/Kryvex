"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import type { CustomField } from "@kryvex/types";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import { MultilineField } from "./MultilineField";
import { TagsInput } from "./TagsInput";
import { TextField } from "./TextField";
import { Button } from "./Button";

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
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      notes: notes || undefined,
      customFields,
      file,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <TextField label="Title" value={title} required onChange={setTitle} />
      <TagsInput
        label="Tags"
        values={tags}
        onChange={setTags}
        placeholder="Add a tag and press Enter"
      />
      <MultilineField
        label="Notes"
        value={notes}
        onChange={setNotes}
        rows={3}
      />

      <label className="flex flex-col gap-1 text-sm">
        File
        <input
          type="file"
          accept={ACCEPT_BY_TYPE[type]}
          onChange={handleFileChange}
          className="rounded border px-3 py-2"
        />
      </label>

      <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? "Uploading…" : "Upload"}
        </Button>
        <Button onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
