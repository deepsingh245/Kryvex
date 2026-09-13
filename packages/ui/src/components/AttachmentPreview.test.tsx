import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentPreview } from "./AttachmentPreview";

beforeEach(() => {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock-url"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("AttachmentPreview", () => {
  it("renders the filename, mimeType, and human-readable size", () => {
    render(
      <AttachmentPreview
        fileName="passport.jpg"
        mimeType="image/jpeg"
        sizeBytes={2048}
        onRequestContent={vi.fn()}
      />,
    );
    expect(screen.getByText(/passport\.jpg/)).toBeInTheDocument();
    expect(screen.getByText(/image\/jpeg/)).toBeInTheDocument();
    expect(screen.getByText(/2\.0 KB/)).toBeInTheDocument();
  });

  it("decrypts and shows an inline preview for images on demand", async () => {
    const onRequestContent = vi
      .fn()
      .mockResolvedValue(new Uint8Array([1, 2, 3]));
    render(
      <AttachmentPreview
        fileName="passport.jpg"
        mimeType="image/jpeg"
        sizeBytes={2048}
        onRequestContent={onRequestContent}
      />,
    );
    expect(onRequestContent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Show preview" }));

    await waitFor(() => expect(onRequestContent).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: "passport.jpg" }),
      ).toBeInTheDocument(),
    );
  });

  it("shows an error if content decryption fails", async () => {
    const onRequestContent = vi.fn().mockRejectedValue(new Error("nope"));
    render(
      <AttachmentPreview
        fileName="passport.jpg"
        mimeType="image/jpeg"
        sizeBytes={2048}
        onRequestContent={onRequestContent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show preview" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });

  it("opens PDFs via window.open rather than a forced download", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const onRequestContent = vi.fn().mockResolvedValue(new Uint8Array([1]));
    render(
      <AttachmentPreview
        fileName="lease.pdf"
        mimeType="application/pdf"
        sizeBytes={4096}
        onRequestContent={onRequestContent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open PDF" }));
    await waitFor(() =>
      expect(openSpy).toHaveBeenCalledWith(
        "blob:mock-url",
        "_blank",
        "noopener,noreferrer",
      ),
    );
  });

  it("triggers a named download for generic files", async () => {
    const onRequestContent = vi.fn().mockResolvedValue(new Uint8Array([1]));
    render(
      <AttachmentPreview
        fileName="backup.key"
        mimeType="application/octet-stream"
        sizeBytes={512}
        onRequestContent={onRequestContent}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    await waitFor(() => expect(onRequestContent).toHaveBeenCalledTimes(1));
  });
});
