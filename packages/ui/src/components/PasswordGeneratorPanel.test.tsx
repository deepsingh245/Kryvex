import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PasswordGeneratorPanel } from "./PasswordGeneratorPanel";

function stubClipboard() {
  const writeText = vi.fn().mockResolvedValue(undefined);
  const readText = vi.fn().mockResolvedValue("");
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText, readText },
    configurable: true,
  });
  return { writeText, readText };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PasswordGeneratorPanel", () => {
  it("shows a message when every character set is disabled", () => {
    render(<PasswordGeneratorPanel />);
    fireEvent.click(screen.getByLabelText("a-z"));
    fireEvent.click(screen.getByLabelText("A-Z"));
    fireEvent.click(screen.getByLabelText("0-9"));
    fireEvent.click(screen.getByLabelText("!@#"));

    expect(
      screen.getByText(
        "Enable at least one character set to generate a password.",
      ),
    ).toBeInTheDocument();
  });

  it("copies via copyWithAutoClear, clearing after clipboardClearSeconds", async () => {
    const { writeText, readText } = stubClipboard();
    vi.useFakeTimers();
    render(<PasswordGeneratorPanel clipboardClearSeconds={5} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await vi.advanceTimersByTimeAsync(0);
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]?.[0] as string;
    readText.mockResolvedValue(copied);
    await vi.advanceTimersByTimeAsync(5000);
    expect(writeText).toHaveBeenCalledWith("");
    vi.useRealTimers();
  });

  it("surfaces a clipboard-write failure", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText, readText: vi.fn().mockResolvedValue("") },
      configurable: true,
    });
    render(<PasswordGeneratorPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(
      await screen.findByText("Unable to copy to the clipboard."),
    ).toBeInTheDocument();
  });
});
