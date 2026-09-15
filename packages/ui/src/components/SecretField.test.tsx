import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SecretField } from "./SecretField";

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

describe("SecretField", () => {
  it("associates the label with the input via htmlFor/id", () => {
    render(<SecretField label="Password" value="hunter2" readOnly />);
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("sets aria-pressed on the Reveal/Hide toggle", () => {
    render(<SecretField label="Password" value="hunter2" readOnly />);
    const toggle = screen.getByRole("button", { name: "Reveal" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Hide" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("announces a copy via an aria-live region", async () => {
    stubClipboard();
    render(<SecretField label="Password" value="hunter2" readOnly />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent("Copied"),
    );
  });

  it("passes clipboardClearSeconds through to the clipboard-clear delay", async () => {
    const { writeText, readText } = stubClipboard();
    readText.mockResolvedValue("hunter2");
    vi.useFakeTimers();
    render(
      <SecretField
        label="Password"
        value="hunter2"
        readOnly
        clipboardClearSeconds={5}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(writeText).toHaveBeenCalledWith("hunter2");
    await vi.advanceTimersByTimeAsync(5000);
    expect(writeText).toHaveBeenCalledWith("");
    vi.useRealTimers();
  });
});
