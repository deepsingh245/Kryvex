import * as DocumentPicker from "expo-document-picker";
import { Directory, File, Paths } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import { randomId } from "./randomId";

// Matches firebase/storage.rules' upload size cap exactly (and web's forms).
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

export class AttachmentTooLargeError extends Error {
  constructor() {
    super(
      `That file is too large (max ${MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB).`,
    );
  }
}

/** A file the user picked — still plaintext, still on the device only. */
export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
  size: number | undefined;
}

export type PickKind = "image" | "pdf" | "any";

function checkSize(size: number | undefined): void {
  if (size !== undefined && size > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentTooLargeError();
  }
}

/** Returns null if the user cancelled. Throws AttachmentTooLargeError. */
export async function pickFile(kind: PickKind): Promise<PickedFile | null> {
  if (kind === "image") {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
      exif: false,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return null;
    checkSize(asset.fileSize);
    return {
      uri: asset.uri,
      name: asset.fileName ?? "photo.jpg",
      mimeType: asset.mimeType ?? "image/jpeg",
      size: asset.fileSize,
    };
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: kind === "pdf" ? "application/pdf" : "*/*",
    multiple: false,
    copyToCacheDirectory: true,
  });
  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;
  checkSize(asset.size);
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? "application/octet-stream",
    size: asset.size,
  };
}

function isInAppCache(uri: string): boolean {
  return uri.startsWith(Paths.cache.uri);
}

/**
 * Reads a picked file's bytes, then deletes the picker's own plaintext copy
 * if it made one in this app's cache (both pickers copy there). The user's
 * original file elsewhere is never touched.
 */
export async function readPickedFile(picked: PickedFile): Promise<Uint8Array> {
  const file = new File(picked.uri);
  try {
    const bytes = await file.bytes();
    checkSize(bytes.length);
    return bytes;
  } finally {
    if (isInAppCache(picked.uri)) {
      try {
        file.delete();
      } catch {
        // Already gone — nothing to clean up.
      }
    }
  }
}

// Decrypted copies handed to the system share sheet / viewer live only
// here, inside the app's sandboxed cache.
const DECRYPTED_DIR_NAME = "kryvex-decrypted";
// The receiving app may still be reading the file after shareAsync resolves
// (Android resolves when the chooser returns) — same bounded-delay idea as
// web's object-URL revoke. purgeDecryptedFiles() is the backstop.
const SHARE_CLEANUP_DELAY_MS = 60_000;

function decryptedDir(): Directory {
  return new Directory(Paths.cache, DECRYPTED_DIR_NAME);
}

// Keeps only characters safe in a file name on both platforms; anything
// else (path separators, control characters, reserved symbols) becomes "_".
// The name came from the user's own decrypted data, but it's still never
// allowed to steer the path outside the temp folder.
export function safeFileName(name: string): string {
  const cleaned = Array.from(name, (ch) =>
    ch < " " || '/\\:*?"<>|'.includes(ch) ? "_" : ch,
  )
    .join("")
    .trim();
  const base = cleaned === "." || cleaned === ".." ? "" : cleaned;
  return base.slice(0, 120) || "attachment";
}

/**
 * Writes decrypted bytes to a private temp file and opens the system share
 * sheet (open in a viewer, save, send). The temp file is deleted after a
 * delay; purgeDecryptedFiles() removes anything left on lock/sign-out/start.
 */
export async function shareDecryptedFile(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string,
): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  const root = decryptedDir();
  root.create({ idempotent: true, intermediates: true });
  // Per-share subfolder keeps the original file name visible to the
  // receiving app without collisions.
  const folder = new Directory(root, randomId("share"));
  folder.create({ intermediates: true });
  const file = new File(folder, safeFileName(fileName));
  file.create();
  file.write(bytes);
  try {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: fileName });
  } finally {
    setTimeout(() => {
      try {
        if (folder.exists) folder.delete();
      } catch {
        // purgeDecryptedFiles() will get it.
      }
    }, SHARE_CLEANUP_DELAY_MS);
  }
}

/** Removes every decrypted temp file. Safe to call any time. */
export function purgeDecryptedFiles(): void {
  try {
    const dir = decryptedDir();
    if (dir.exists) dir.delete();
  } catch {
    // Nothing there, or already being removed.
  }
}
