import { beforeEach, describe, expect, it, vi } from "vitest";

const setDoc = vi.fn();

vi.mock("firebase/firestore", () => ({
  doc: (_firestore: unknown, ...segments: string[]) => segments.join("/"),
  getDoc: vi.fn(),
  serverTimestamp: () => "SERVER_TIMESTAMP",
  setDoc: (...args: unknown[]) => setDoc(...args),
}));
vi.mock("firebase/storage", () => ({
  getBytes: vi.fn(),
  ref: vi.fn(),
  uploadBytes: vi.fn(),
}));

const { softDeleteAttachmentDocument } = await import("./attachments");

describe("softDeleteAttachmentDocument", () => {
  beforeEach(() => {
    setDoc.mockReset();
  });

  it("bumps the revision by one, as firestore.rules requires", async () => {
    await softDeleteAttachmentDocument({} as never, "alice", "att1", {
      id: "att1",
      revision: 3,
      deleted: false,
    });
    expect(setDoc).toHaveBeenCalledWith("users/alice/attachments/att1", {
      id: "att1",
      revision: 4,
      deleted: true,
      updatedAt: "SERVER_TIMESTAMP",
    });
  });

  it("refuses to write when the fetched doc has no valid revision", async () => {
    await expect(
      softDeleteAttachmentDocument({} as never, "alice", "att1", {
        id: "att1",
      }),
    ).rejects.toThrow("no valid revision");
    expect(setDoc).not.toHaveBeenCalled();
  });
});
