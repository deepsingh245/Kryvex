import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnlockPage from "./page";
import { useVault } from "@/providers/VaultProvider";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
}));

vi.mock("@/providers/VaultProvider", () => ({
  useVault: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);

const LOCKED_STATE = {
  status: "AUTHENTICATED_LOCKED" as const,
  user: { uid: "1", email: "a@b.com" },
};

function baseVault(overrides: Partial<ReturnType<typeof useVault>> = {}) {
  return {
    state: LOCKED_STATE,
    signUp: vi.fn(),
    signIn: vi.fn(),
    unlock: vi.fn(),
    lock: vi.fn(),
    recoverVault: vi.fn(),
    settings: undefined,
    updateSettings: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  };
}

describe("UnlockPage", () => {
  it("shows the Unlock Your Vault heading and who is signed in", () => {
    mockedUseVault.mockReturnValue(baseVault());
    render(<UnlockPage />);
    expect(
      screen.getByRole("heading", { name: "Unlock Your Vault" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Signed in as a@b.com")).toBeInTheDocument();
  });

  it("calls unlock and navigates home on success", async () => {
    const unlock = vi.fn().mockResolvedValue(undefined);
    mockedUseVault.mockReturnValue(baseVault({ unlock }));
    render(<UnlockPage />);

    fireEvent.change(screen.getByLabelText("Master password"), {
      target: { value: "correct-horse-battery" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() =>
      expect(unlock).toHaveBeenCalledWith("correct-horse-battery"),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("shows a generic error when unlock fails", async () => {
    const unlock = vi.fn().mockRejectedValue(new Error("nope"));
    mockedUseVault.mockReturnValue(baseVault({ unlock }));
    render(<UnlockPage />);

    fireEvent.change(screen.getByLabelText("Master password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Unlock" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect master password.",
    );
  });

  it("redirects to /sign-in when SIGNED_OUT", () => {
    mockedUseVault.mockReturnValue(
      baseVault({ state: { status: "SIGNED_OUT" } }),
    );
    render(<UnlockPage />);
    expect(replace).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects to / when UNLOCKED", () => {
    mockedUseVault.mockReturnValue(
      baseVault({
        state: {
          status: "UNLOCKED",
          user: { uid: "1", email: "a@b.com" },
          stretchedMasterKey: new Uint8Array(),
          vaultEncryptionKey: new Uint8Array(),
        },
      }),
    );
    render(<UnlockPage />);
    expect(replace).toHaveBeenCalledWith("/");
  });
});
