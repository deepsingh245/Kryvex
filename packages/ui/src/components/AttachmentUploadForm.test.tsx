import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AttachmentUploadForm } from "./AttachmentUploadForm";

function sampleFile(
  overrides: Partial<{ name: string; size: number; type: string }> = {},
) {
  const { name = "photo.png", size = 1024, type = "image/png" } = overrides;
  const file = new File(["x"], name, { type });
  // Avoid actually allocating a multi-megabyte string for the oversize
  // test — File.prototype.size is otherwise read-only.
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("AttachmentUploadForm", () => {
  it("renders title and a file input, with Tags/Custom Fields collapsed and no Notes field", () => {
    render(
      <AttachmentUploadForm
        type="image"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.queryByLabelText("Tags")).not.toBeInTheDocument();
    expect(screen.queryByText("Custom fields")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add tags" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add custom field" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Notes")).not.toBeInTheDocument();
    expect(screen.getByLabelText("File")).toBeInTheDocument();
  });

  it("reveals Tags when its reveal button is clicked", () => {
    render(
      <AttachmentUploadForm
        type="image"
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add tags" }));
    expect(screen.getByLabelText("Tags")).toBeInTheDocument();
  });

  it("does not submit without a title", () => {
    const onSubmit = vi.fn();
    render(
      <AttachmentUploadForm
        type="image"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("File"), {
      target: { files: [sampleFile()] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Title is required.");
  });

  it("does not submit without a file", () => {
    const onSubmit = vi.fn();
    render(
      <AttachmentUploadForm
        type="image"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My Photo" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Choose a file to upload.",
    );
  });

  it("submits title/tags/notes/customFields/file once both title and file are set", () => {
    const onSubmit = vi.fn();
    render(
      <AttachmentUploadForm
        type="image"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My Photo" },
    });
    const file = sampleFile();
    fireEvent.change(screen.getByLabelText("File"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0]![0];
    expect(values.title).toBe("My Photo");
    expect(values.file).toBe(file);
  });

  it("rejects a file over the 50MB cap and does not submit", () => {
    const onSubmit = vi.fn();
    render(
      <AttachmentUploadForm
        type="file"
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Huge file" },
    });
    const oversized = sampleFile({ size: 50 * 1024 * 1024 + 1 });
    fireEvent.change(screen.getByLabelText("File"), {
      target: { files: [oversized] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent("too large");
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
