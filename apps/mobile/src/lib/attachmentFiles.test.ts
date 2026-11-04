import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Sharing from "expo-sharing";
import {
  AttachmentTooLargeError,
  MAX_ATTACHMENT_BYTES,
  pickFile,
  purgeDecryptedFiles,
  readPickedFile,
  safeFileName,
  shareDecryptedFile,
} from "./attachmentFiles";

// In-memory stand-in for expo-file-system's File/Directory/Paths.
const mockFs = new Map<string, Uint8Array>();
const mockDirs = new Set<string>();
jest.mock("expo-file-system", () => {
  function join(parts: unknown[]): string {
    return parts
      .map((p) =>
        typeof p === "string"
          ? p
          : (p as { uri: string }).uri.replace(/\/$/, ""),
      )
      .join("/");
  }
  class MockDirectory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists() {
      return mockDirs.has(this.uri);
    }
    create() {
      mockDirs.add(this.uri);
    }
    delete() {
      for (const d of [...mockDirs])
        if (d.startsWith(this.uri)) mockDirs.delete(d);
      for (const f of [...mockFs.keys()])
        if (f.startsWith(this.uri)) mockFs.delete(f);
    }
  }
  class MockFile {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    create() {
      mockFs.set(this.uri, new Uint8Array());
    }
    write(bytes: Uint8Array) {
      mockFs.set(this.uri, bytes);
    }
    async bytes() {
      const b = mockFs.get(this.uri);
      if (!b) throw new Error("missing");
      return b;
    }
    delete() {
      mockFs.delete(this.uri);
    }
  }
  return {
    File: MockFile,
    Directory: MockDirectory,
    Paths: { cache: { uri: "file:///cache" } },
  };
});
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-document-picker", () => ({ getDocumentAsync: jest.fn() }));
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

beforeEach(() => {
  mockFs.clear();
  mockDirs.clear();
  jest.clearAllMocks();
});

describe("pickFile", () => {
  it("returns null when the user cancels", async () => {
    jest
      .mocked(DocumentPicker.getDocumentAsync)
      .mockResolvedValue({ canceled: true, assets: null } as never);
    expect(await pickFile("pdf")).toBeNull();
  });

  it("rejects a file over the 50 MB cap before reading it", async () => {
    jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
      canceled: false,
      assets: [
        { uri: "file:///cache/big.jpg", fileSize: MAX_ATTACHMENT_BYTES + 1 },
      ],
    } as never);
    await expect(pickFile("image")).rejects.toBeInstanceOf(
      AttachmentTooLargeError,
    );
  });

  it("maps a document result to a PickedFile", async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///cache/doc.pdf",
          name: "lease.pdf",
          mimeType: "application/pdf",
          size: 10,
        },
      ],
    } as never);
    expect(await pickFile("pdf")).toEqual({
      uri: "file:///cache/doc.pdf",
      name: "lease.pdf",
      mimeType: "application/pdf",
      size: 10,
    });
  });
});

describe("readPickedFile", () => {
  it("returns the bytes and deletes the picker's plaintext cache copy", async () => {
    mockFs.set("file:///cache/doc.pdf", new Uint8Array([1, 2, 3]));
    const bytes = await readPickedFile({
      uri: "file:///cache/doc.pdf",
      name: "doc.pdf",
      mimeType: "application/pdf",
      size: 3,
    });
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
    expect(mockFs.has("file:///cache/doc.pdf")).toBe(false);
  });

  it("never deletes a file outside the app cache", async () => {
    mockFs.set("file:///sdcard/doc.pdf", new Uint8Array([1]));
    await readPickedFile({
      uri: "file:///sdcard/doc.pdf",
      name: "doc.pdf",
      mimeType: "application/pdf",
      size: 1,
    });
    expect(mockFs.has("file:///sdcard/doc.pdf")).toBe(true);
  });
});

describe("shareDecryptedFile / purgeDecryptedFiles", () => {
  it("shares a temp file under the decrypted folder, then removes it after the delay", async () => {
    jest.useFakeTimers();
    await shareDecryptedFile(
      new Uint8Array([9]),
      "lease.pdf",
      "application/pdf",
    );
    const [uri] = jest.mocked(Sharing.shareAsync).mock.calls[0]!;
    expect(uri).toMatch(/^file:\/\/\/cache\/kryvex-decrypted\/.+\/lease\.pdf$/);
    expect(mockFs.has(uri)).toBe(true);

    jest.advanceTimersByTime(60_000);
    expect(mockFs.has(uri)).toBe(false);
    jest.useRealTimers();
  });

  it("purge removes every decrypted temp file", async () => {
    await shareDecryptedFile(new Uint8Array([9]), "a.pdf", "application/pdf");
    expect(mockFs.size).toBe(1);
    purgeDecryptedFiles();
    expect(mockFs.size).toBe(0);
  });
});

describe("safeFileName", () => {
  it("can't escape the temp folder", () => {
    expect(safeFileName("../../etc/passwd")).toBe(".._.._etc_passwd");
    expect(safeFileName("..")).toBe("attachment");
    expect(safeFileName("")).toBe("attachment");
    expect(safeFileName("bad\u0000name.pdf")).toBe("bad_name.pdf");
  });
});
