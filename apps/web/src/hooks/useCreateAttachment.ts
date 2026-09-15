"use client";

import {
  createAttachmentDocument,
  initializeKryvexFirebase,
  uploadAttachmentBlob,
} from "@kryvex/firebase";
import { attachmentEnvelopeToBlob, encryptAttachment } from "@kryvex/vault";
import {
  webFirebaseAppCheckOptions,
  webFirebaseConfig,
  webFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";
import { useVault } from "@/providers/VaultProvider";

// See useVaultItems.ts's own getServices() comment: lazy, client-only,
// never called from render.
function getServices() {
  return initializeKryvexFirebase(
    webFirebaseConfig,
    webFirebaseEmulatorEnv,
    webFirebaseAppCheckOptions,
  );
}

// CSPRNG-backed fallback for the (practically unreachable on any modern
// runtime) case where crypto.randomUUID is unavailable but
// crypto.getRandomValues still is — never Math.random(), even for a
// non-secret id, per CLAUDE.md's hard rule.
function randomIdFallback(prefix: string): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${prefix}-${Date.now()}-${hex}`;
}

function newAttachmentId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : randomIdFallback("att");
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
