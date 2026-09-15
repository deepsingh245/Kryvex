"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

// Object URLs stay valid past this component's own lifetime revoke (e.g. a
// download/new-tab open needs a moment to actually read the blob) but must
// not leak indefinitely — a decrypted blob accessible via a stale URL is
// exactly the kind of lingering plaintext this revoke schedule avoids.
const REVOKE_DELAY_MS = 60_000;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface AttachmentPreviewProps {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  // Lazy — only invoked on user action (matches docs/SYNC_ENGINE.md §8's
  // "lazy attachment blob sync": the ciphertext blob is never fetched or
  // decrypted until the user explicitly asks to see/download it).
  onRequestContent: () => Promise<Uint8Array>;
}

/**
 * Item Detail's rendering for Image/PDF/File items — replaces the generic
 * field-list block for these three types. System-viewer hand-off for
 * everything but images (see PLAN.md's Phase 6 scope note): no bundled PDF
 * renderer, just the browser's own PDF/file handling via an object URL.
 */
export function AttachmentPreview({
  fileName,
  mimeType,
  sizeBytes,
  onRequestContent,
}: AttachmentPreviewProps) {
  const isImage = mimeType.startsWith("image/");
  const isPdf = mimeType === "application/pdf";

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  function scheduleRevoke(url: string) {
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }

  async function handleShowPreview() {
    setLoading(true);
    setError(null);
    try {
      const bytes = await onRequestContent();
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: mimeType }),
      );
      setImageUrl(url);
    } catch {
      setError("Unable to load this attachment.");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenOrDownload() {
    setLoading(true);
    setError(null);
    try {
      const bytes = await onRequestContent();
      const url = URL.createObjectURL(
        new Blob([new Uint8Array(bytes)], { type: mimeType }),
      );
      if (isPdf) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else if (anchorRef.current) {
        anchorRef.current.href = url;
        anchorRef.current.download = fileName;
        anchorRef.current.click();
      }
      scheduleRevoke(url);
    } catch {
      setError("Unable to load this attachment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5 text-sm">
      <p className="text-text-secondary">
        {fileName} · {mimeType} · {formatBytes(sizeBytes)}
      </p>

      {isImage ? (
        imageUrl ? (
          // Plain <img>, not next/image: this is a shared, framework-
          // agnostic package, and the src is a decrypted in-memory blob
          // URL, not a static/optimizable asset.
          <img
            src={imageUrl}
            alt={fileName}
            className="max-h-96 max-w-full rounded-lg border border-border object-contain"
          />
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={handleShowPreview}
            disabled={loading}
          >
            {loading ? "Decrypting…" : "Show preview"}
          </Button>
        )
      ) : (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={handleOpenOrDownload}
            disabled={loading}
          >
            {loading ? "Decrypting…" : isPdf ? "Open PDF" : "Download"}
          </Button>
          {/* Hidden anchor used to trigger a named download without
              navigating the app away — never rendered visibly. */}
          <a ref={anchorRef} className="hidden" aria-hidden="true">
            {fileName}
          </a>
        </>
      )}

      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
