"use client";

import { useEffect, useState } from "react";
import {
  downloadAttachmentBlob,
  fetchAttachmentDocument,
  initializeKryvexFirebase,
} from "@kryvex/firebase";
import {
  attachmentDocumentSchema,
  type AttachmentDocumentInput,
} from "@kryvex/validation";
import {
  blobToAttachmentEnvelope,
  decryptAttachmentContent,
  decryptAttachmentFileName,
} from "@kryvex/vault";
import {
  webFirebaseConfig,
  webFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";
import { useVault } from "@/providers/VaultProvider";

// See useVaultItems.ts's own getServices() comment: lazy, client-only,
// never called from render.
function getServices() {
  return initializeKryvexFirebase(webFirebaseConfig, webFirebaseEmulatorEnv);
}

export interface AttachmentMetadata {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UseAttachmentResult {
  metadata: AttachmentMetadata | undefined;
  loading: boolean;
  error: string | null;
  // Lazy — only fetches/decrypts the actual file bytes when called,
  // matching docs/SYNC_ENGINE.md §8's "lazy attachment blob sync".
  loadContent: () => Promise<Uint8Array>;
}

/**
 * Fetches an attachment's metadata envelope eagerly (a cheap Firestore
 * read; only the small encrypted filename is decrypted immediately) and
 * exposes a lazy loadContent() for the actual file bytes — the Storage
 * download/decrypt only ever happens on explicit user action (see
 * AttachmentPreview's onRequestContent).
 */
export function useAttachment(attachmentId: string): UseAttachmentResult {
  const { state } = useVault();
  const [doc, setDoc] = useState<AttachmentDocumentInput | undefined>();
  const [fileName, setFileName] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const uid = state.status === "UNLOCKED" ? state.user.uid : undefined;
  const vaultEncryptionKey =
    state.status === "UNLOCKED" ? state.vaultEncryptionKey : undefined;

  useEffect(() => {
    if (!uid || !vaultEncryptionKey) return;
    let cancelled = false;

    void (async () => {
      try {
        const raw = await fetchAttachmentDocument(
          getServices().firestore,
          uid,
          attachmentId,
        );
        if (cancelled) return;
        if (!raw) {
          setError("Attachment not found.");
          return;
        }
        const parsed = attachmentDocumentSchema.parse(raw);
        setDoc(parsed);
        setFileName(
          parsed.encryptedFileName
            ? decryptAttachmentFileName(
                vaultEncryptionKey,
                parsed.wrappedAttachmentKey,
                parsed.encryptedFileName,
              )
            : "Untitled",
        );
      } catch {
        if (!cancelled) setError("Unable to load this attachment.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, vaultEncryptionKey, attachmentId]);

  async function loadContent(): Promise<Uint8Array> {
    if (!uid || !vaultEncryptionKey) throw new Error("Vault is locked.");
    if (!doc) throw new Error("Attachment not loaded.");
    const blob = await downloadAttachmentBlob(
      getServices().storage,
      uid,
      attachmentId,
    );
    const envelope = blobToAttachmentEnvelope(blob);
    return decryptAttachmentContent(
      vaultEncryptionKey,
      doc.wrappedAttachmentKey,
      envelope,
    );
  }

  return {
    metadata:
      doc && fileName
        ? { fileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes }
        : undefined,
    loading,
    error,
    loadContent,
  };
}
