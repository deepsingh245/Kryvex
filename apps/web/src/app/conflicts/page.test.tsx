import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ConflictsPage from "./page";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/providers/VaultProvider", () => ({
  useVault: vi.fn(),
}));

vi.mock("@/hooks/useVaultItems", () => ({
  useVaultItems: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);
const mockedUseVaultItems = vi.mocked(useVaultItems);

const UNLOCKED_STATE = {
  status: "UNLOCKED" as const,
  user: { uid: "1", email: "a@b.com" },
  stretchedMasterKey: new Uint8Array(),
  vaultEncryptionKey: new Uint8Array(),
};

describe("ConflictsPage", () => {
  it("shows a no-conflicts message when there are none", () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      signOut: vi.fn(),
    });
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      isOnline: true,
      conflicts: [],
      createItem: vi.fn(),
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      resolveConflict: vi.fn(),
    });
    render(<ConflictsPage />);
    expect(screen.getByText("No conflicts to review.")).toBeInTheDocument();
  });

  it("renders both versions and calls resolveConflict for each action", () => {
    const resolveConflict = vi.fn();
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      signOut: vi.fn(),
    });
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      isOnline: true,
      conflicts: [
        {
          itemId: "item1",
          localContent: {
            type: "login",
            title: "Mine",
            tags: [],
            customFields: [],
            username: "u",
            password: "p",
            websites: [],
          },
          serverContent: {
            type: "login",
            title: "Server's",
            tags: [],
            customFields: [],
            username: "u",
            password: "p",
            websites: [],
          },
        },
      ],
      createItem: vi.fn(),
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      resolveConflict,
    });
    render(<ConflictsPage />);

    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(screen.getByText("Server's")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Keep mine"));
    expect(resolveConflict).toHaveBeenCalledWith("item1", "keepMine");

    fireEvent.click(screen.getByText("Keep server's"));
    expect(resolveConflict).toHaveBeenCalledWith("item1", "keepServer");

    fireEvent.click(screen.getByText("Keep both"));
    expect(resolveConflict).toHaveBeenCalledWith("item1", "keepBoth");
  });
});
