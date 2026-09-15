import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import GeneratorPage from "./page";
import { useVault } from "@/providers/VaultProvider";

vi.mock("@/providers/VaultProvider", () => ({
  useVault: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);

// SIGNED_OUT/AUTHENTICATED_LOCKED redirect gating is exercised once in
// ../layout.test.tsx — this page no longer has that logic itself.
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
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    render(<GeneratorPage />);
    expect(
      screen.getByRole("button", { name: "Regenerate" }),
    ).toBeInTheDocument();
  });
});
