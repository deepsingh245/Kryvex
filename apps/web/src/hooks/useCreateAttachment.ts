"use client";

import {
  createAttachmentDocument,
  initializeKryvexFirebase,
  uploadAttachmentBlob,
} from "@kryvex/firebase";
import { attachmentEnvelopeToBlob, encryptAttachment } from "@kryvex/vault";
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

function newAttachmentId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `att-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Encrypts a raw File client-side and uploads it as a new attachment — see
 * docs/DATA_MODEL.md §3. `itemId` must already be decided by the caller
 * (see useVaultItems.ts's exported newItemId): AttachmentDocument.itemId
 * has to exist before the item write that references this attachment back,
 * so the item's id is generated up front rather than waiting for
 * createItem's return value. Returns the new attachment's id — the caller
 * is responsible for creating the owning VaultItemDocument afterward
 * (attachmentId goes into its ItemContent, the id into attachmentRefs).
 */
export function useCreateAttachment() {
  const { state } = useVault();

  return async function createAttachment(
    file: File,
    itemId: string,
  ): Promise<string> {
    if (state.status !== "UNLOCKED") throw new Error("Vault is locked.");
    const uid = state.user.uid;
    const { vaultEncryptionKey } = state;

    const fileBytes = new Uint8Array(await file.arrayBuffer());
    const { wrappedAttachmentKey, encryptedData, encryptedFileName } =
      encryptAttachment(vaultEncryptionKey, fileBytes, file.name);

    const attachmentId = newAttachmentId();
    const blob = attachmentEnvelopeToBlob(encryptedData);
    await uploadAttachmentBlob(getServices().storage, uid, attachmentId, blob);

    await createAttachmentDocument(getServices().firestore, uid, attachmentId, {
      id: attachmentId,
      ownerId: uid,
      itemId,
      revision: 0,
      deleted: false,
      wrappedAttachmentKey,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      storagePath: `users/${uid}/attachments/${attachmentId}`,
      encryptedFileName,
    });

    return attachmentId;
  };
}
