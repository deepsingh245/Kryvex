import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmergencyKit } from "./EmergencyKit";

describe("EmergencyKit", () => {
  it("renders the recovery key", () => {
    render(<EmergencyKit recoveryKey="AB12-CD34" onContinue={vi.fn()} />);
    expect(screen.getByText("AB12-CD34")).toBeInTheDocument();
  });

  it("renders a download button", () => {
    render(<EmergencyKit recoveryKey="AB12-CD34" onContinue={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Download as file" }),
    ).toBeInTheDocument();
  });

  it("disables Continue until the acknowledgment checkbox is checked", () => {
    const onContinue = vi.fn();
    render(<EmergencyKit recoveryKey="AB12-CD34" onContinue={onContinue} />);

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();

    fireEvent.click(screen.getByRole("checkbox"));
    expect(continueButton).not.toBeDisabled();

    fireEvent.click(continueButton);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});
