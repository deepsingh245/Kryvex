import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GeneratorPage from "./page";
import { useVault } from "@/providers/VaultProvider";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/providers/VaultProvider", () => ({
  useVault: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);

describe("GeneratorPage", () => {
  it("renders a generated password when signed in", () => {
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
      lock: vi.fn(),
      recoverVault: vi.fn(),
      signOut: vi.fn(),
    });
    render(<GeneratorPage />);
    expect(
      screen.getByRole("button", { name: "Regenerate" }),
    ).toBeInTheDocument();
  });

  it("redirects to /sign-in when SIGNED_OUT", () => {
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      recoverVault: vi.fn(),
      signOut: vi.fn(),
    });
    render(<GeneratorPage />);
    expect(replace).toHaveBeenCalledWith("/sign-in");
  });
});
