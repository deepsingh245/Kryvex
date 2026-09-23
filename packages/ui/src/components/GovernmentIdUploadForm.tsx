"use client";

import { Plus } from "lucide-react";
import { useId, useState, type ChangeEvent, type FormEvent } from "react";
import type { CustomField } from "@kryvex/types";
import { CustomFieldsEditor } from "./CustomFieldsEditor";
import { Label } from "./ui/label";
import { MultilineField } from "./MultilineField";
import { TagsInput } from "./TagsInput";
import { TextField } from "./TextField";
import { Button } from "./ui/button";

// Matches firebase/storage.rules' upload size cap exactly — same limit
// AttachmentUploadForm.tsx enforces, per file.
const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

const FILE_ACCEPT = "image/*,application/pdf";

export interface GovernmentIdUploadFormValues {
  title: string;
  tags: string[];
  // Unlike AttachmentUploadForm.tsx, this IS user-edited here — Notes is a
  // deliberate, one-off exception for this type. See GovernmentIdContent's
  // doc comment in @kryvex/types for why.
  notes: string | undefined;
  customFields: CustomField[];
  frontFile: File;
  backFile: File | undefined;
}

export interface GovernmentIdUploadFormProps {
  onSubmit: (values: GovernmentIdUploadFormValues) => void;
  onCancel: () => void;
  submitting?: boolean;
}

/**
 * Dedicated Add-flow form for the Government ID item type — same
 * "picking/encrypting/uploading is an async, bespoke sequence the caller
 * owns" rationale as AttachmentUploadForm.tsx, extended to two optional
 * file slots (front required, back optional) plus an always-visible Notes
 * field. This component stays free of crypto/Firebase — it only ever
 * hands the caller raw `File`s.
 */
export function GovernmentIdUploadForm({
  onSubmit,
  onCancel,
  submitting,
}: GovernmentIdUploadFormProps) {
  const frontInputId = useId();
  const backInputId = useId();
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTags, setShowTags] = useState(false);
  const [showCustomFields, setShowCustomFields] = useState(false);

  function handleFileChange(
    e: ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
  ) {
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
    if (!frontFile) {
      setError("Choose a front-side file to upload.");
      return;
    }
    setError(null);
    onSubmit({
      title,
      tags,
      notes: notes || undefined,
      customFields,
      frontFile,
      backFile: backFile ?? undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <TextField label="Title" value={title} required onChange={setTitle} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={frontInputId}>Front</Label>
        <input
          id={frontInputId}
          type="file"
          accept={FILE_ACCEPT}
          onChange={(e) => handleFileChange(e, setFrontFile)}
          className="flex h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface text-sm text-foreground shadow-sm outline-none file:mr-3 file:h-11 file:cursor-pointer file:border-0 file:border-r file:border-border file:bg-surface-2 file:px-3.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={backInputId}>Back (optional)</Label>
        <input
          id={backInputId}
          type="file"
          accept={FILE_ACCEPT}
          onChange={(e) => handleFileChange(e, setBackFile)}
          className="flex h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface text-sm text-foreground shadow-sm outline-none file:mr-3 file:h-11 file:cursor-pointer file:border-0 file:border-r file:border-border file:bg-surface-2 file:px-3.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-border-strong focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40"
        />
      </div>

      <MultilineField
        label="Notes"
        value={notes}
        onChange={setNotes}
        rows={3}
      />

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
