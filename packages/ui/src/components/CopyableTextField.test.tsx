import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyableTextField } from "./CopyableTextField";

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
  return { writeText };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CopyableTextField", () => {
  it("associates the label with the input via htmlFor/id", () => {
    render(<CopyableTextField label="Email" value="alice@example.com" readOnly />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders the value visibly, unlike a secret field", () => {
    render(<CopyableTextField label="Email" value="alice@example.com" readOnly />);
    expect(screen.getByLabelText("Email")).toHaveValue("alice@example.com");
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "text");
  });

  it("copies the value via a plain clipboard write and announces it", async () => {
    const { writeText } = stubClipboard();
    render(<CopyableTextField label="Email" value="alice@example.com" readOnly />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("alice@example.com");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Copied"),
    );
  });
});
