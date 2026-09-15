import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SignUpPage from "./page";
import { useVault } from "@/providers/VaultProvider";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), back: vi.fn() }),
}));

vi.mock("@/providers/VaultProvider", () => ({
  useVault: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);

const STRONG_PASSWORD = "Correct-Horse9-Battery";

function typePassword(labelText: string, value: string) {
  fireEvent.change(screen.getByLabelText(labelText), {
    target: { value },
  });
}

describe("SignUpPage", () => {
  it("shows the Create Master Password heading and fields", () => {
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      recoverVault: vi.fn(),
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    render(<SignUpPage />);
    expect(
      screen.getByRole("heading", { name: "Create Master Password" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Master password")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm password")).toBeInTheDocument();
  });

  it("updates the requirements checklist as the password is typed", () => {
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      recoverVault: vi.fn(),
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    render(<SignUpPage />);

    expect(
      screen.getByLabelText("At least 12 characters: not met"),
    ).toBeInTheDocument();

    typePassword("Master password", STRONG_PASSWORD);

    expect(
      screen.getByLabelText("At least 12 characters: met"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Include uppercase and lowercase: met"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Include a number: met")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Include a special character: met"),
    ).toBeInTheDocument();
  });

  it("calls signUp and shows the Emergency Kit on success", async () => {
    const signUp = vi.fn().mockResolvedValue({ recoveryKey: "recovery-key-123" });
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
      signUp,
      signIn: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      recoverVault: vi.fn(),
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    typePassword("Master password", STRONG_PASSWORD);
    typePassword("Confirm password", STRONG_PASSWORD);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith("a@b.com", STRONG_PASSWORD),
    );
    expect(
      await screen.findByRole("heading", { name: "Your Emergency Kit" }),
    ).toBeInTheDocument();
  });

  it("shows an error message when signUp fails", async () => {
    const signUp = vi.fn().mockRejectedValue(new Error("Email already in use."));
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
      signUp,
      signIn: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      recoverVault: vi.fn(),
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    render(<SignUpPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "a@b.com" },
    });
    typePassword("Master password", STRONG_PASSWORD);
    typePassword("Confirm password", STRONG_PASSWORD);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email already in use.",
    );
  });
});
