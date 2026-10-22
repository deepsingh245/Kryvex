import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
// See providers/VaultProvider.tsx for why this comes from "@firebase/auth".
import { getReactNativePersistence } from "@firebase/auth";
import {
  createAttachmentDocument,
  downloadAttachmentBlob,
  fetchAttachmentDocument,
  initializeKryvexFirebaseNative,
  uploadAttachmentBlob,
} from "@kryvex/firebase";
import {
  attachmentDocumentSchema,
  type AttachmentDocumentInput,
} from "@kryvex/validation";
import {
  attachmentEnvelopeToBlob,
  blobToAttachmentEnvelope,
  decryptAttachmentContent,
  decryptAttachmentFileName,
  encryptAttachment,
} from "@kryvex/vault";
import { readPickedFile, type PickedFile } from "@/lib/attachmentFiles";
import {
  mobileFirebaseConfig,
  mobileFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";
import { randomId } from "@/lib/randomId";
import { useVault } from "@/providers/VaultProvider";

function getServices() {
  return initializeKryvexFirebaseNative(
    mobileFirebaseConfig,
    mobileFirebaseEmulatorEnv,
    getReactNativePersistence(AsyncStorage),
  );
}

/**
 * RN counterpart of apps/web's useCreateAttachment — see docs/DATA_MODEL.md
 * §3. Encrypts the picked file on-device, uploads only ciphertext, then
 * writes the AttachmentDocument. `itemId` must be decided by the caller
 * first (useVaultItems' newItemId). Returns the new attachment id.
 */
export function useCreateAttachment() {
  const { state } = useVault();

  return async function createAttachment(
    picked: PickedFile,
    itemId: string,
  ): Promise<string> {
    if (state.status !== "UNLOCKED") throw new Error("Vault is locked.");
    const uid = state.user.uid;
    const { vaultEncryptionKey } = state;

    const fileBytes = await readPickedFile(picked);
    const { wrappedAttachmentKey, encryptedData, encryptedFileName } =
      encryptAttachment(vaultEncryptionKey, fileBytes, picked.name);
    // Plaintext is no longer needed once encrypted.
    fileBytes.fill(0);

    const attachmentId = randomId("att");
    const blob = attachmentEnvelopeToBlob(encryptedData);
    const services = getServices();
    await uploadAttachmentBlob(services.storage, uid, attachmentId, blob);
    await createAttachmentDocument(services.firestore, uid, attachmentId, {
      id: attachmentId,
      ownerId: uid,
      itemId,
      revision: 0,
      deleted: false,
      wrappedAttachmentKey,
      mimeType: picked.mimeType,
      sizeBytes: fileBytes.length,
      storagePath: `users/${uid}/attachments/${attachmentId}`,
      encryptedFileName,
    });
    return attachmentId;
  };
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
  /** Lazy: downloads + decrypts only on explicit user action. */
  loadContent: () => Promise<Uint8Array>;
}

/** RN counterpart of apps/web's useAttachment — same eager-metadata / lazy-bytes split. */
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
    return decryptAttachmentContent(
      vaultEncryptionKey,
      doc.wrappedAttachmentKey,
      blobToAttachmentEnvelope(blob),
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
