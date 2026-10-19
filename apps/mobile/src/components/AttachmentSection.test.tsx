import { fireEvent, render, screen } from "@testing-library/react-native";
import { AttachmentSection } from "./AttachmentSection";
import { useAttachment } from "@/hooks/useAttachments";
import { shareDecryptedFile } from "@/lib/attachmentFiles";

jest.mock("@/hooks/useAttachments", () => ({ useAttachment: jest.fn() }));
jest.mock("@/lib/attachmentFiles", () => ({
  shareDecryptedFile: jest.fn(async () => undefined),
}));

const mockedUseAttachment = jest.mocked(useAttachment);

function withAttachment(mimeType: string, loadContent = jest.fn()) {
  mockedUseAttachment.mockReturnValue({
    metadata: { fileName: "scan.png", mimeType, sizeBytes: 2048 },
    loading: false,
    error: null,
    loadContent,
  });
  return loadContent;
}

describe("AttachmentSection", () => {
  it("doesn't download anything until asked", async () => {
    const loadContent = withAttachment("image/png");
    await render(<AttachmentSection attachmentId="att1" />);
    expect(screen.getByText("scan.png")).toBeTruthy();
    expect(loadContent).not.toHaveBeenCalled();
  });

  it("shows an image inline from an in-memory data URI", async () => {
    withAttachment(
      "image/png",
      jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    );
    await render(<AttachmentSection attachmentId="att1" />);
    await fireEvent.press(screen.getByText("Show"));
    const image = await screen.findByTestId("attachment-image");
    expect(image.props.source).toEqual({ uri: "data:image/png;base64,AQID" });
    expect(shareDecryptedFile).not.toHaveBeenCalled();
  });

  it("hands non-images to the share sheet with name and type", async () => {
    const bytes = new Uint8Array([7]);
    withAttachment("application/pdf", jest.fn().mockResolvedValue(bytes));
    await render(<AttachmentSection attachmentId="att1" />);
    expect(screen.queryByText("Show")).toBeNull();
    await fireEvent.press(screen.getByText("Open / share"));
    expect(shareDecryptedFile).toHaveBeenCalledWith(
      bytes,
      "scan.png",
      "application/pdf",
    );
  });

  it("surfaces a decrypt/download failure", async () => {
    withAttachment(
      "application/pdf",
      jest.fn().mockRejectedValue(new Error("tag mismatch")),
    );
    await render(<AttachmentSection attachmentId="att1" />);
    await fireEvent.press(screen.getByText("Open / share"));
    expect(
      await screen.findByText("Couldn't open this attachment. Try again."),
    ).toBeTruthy();
  });
});
