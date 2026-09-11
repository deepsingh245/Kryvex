import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Home from "./page";
import { useVault } from "@/providers/VaultProvider";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/providers/VaultProvider", () => ({
  useVault: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);

describe("Home", () => {
  it("renders the empty-vault stub when UNLOCKED", () => {
    mockedUseVault.mockReturnValue({
      state: {
        status: "UNLOCKED",
        user: { uid: "1", email: "a@b.com" },
        stretchedMasterKey: new Uint8Array(),
        vaultEncryptionKey: new Uint8Array(),
      },
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      signOut: vi.fn(),
    });
    render(<Home />);
    expect(screen.getByText("Your vault is empty")).toBeInTheDocument();
    expect(screen.getByText(/a@b.com/)).toBeInTheDocument();
  });

  it("redirects to /sign-in when SIGNED_OUT", () => {
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      signOut: vi.fn(),
    });
    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects to /unlock when AUTHENTICATED_LOCKED", () => {
    mockedUseVault.mockReturnValue({
      state: {
        status: "AUTHENTICATED_LOCKED",
        user: { uid: "1", email: "a@b.com" },
      },
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      signOut: vi.fn(),
    });
    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/unlock");
  });
});
