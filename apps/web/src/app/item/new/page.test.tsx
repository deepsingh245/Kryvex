import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewItemPage from "./page";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
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

describe("NewItemPage", () => {
  it("shows the type picker excluding image/pdf/file", () => {
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
      createItem: vi.fn(),
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      isOnline: true,
      conflicts: [],
      resolveConflict: vi.fn(),
    });
    render(<NewItemPage />);
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.queryByText("Image")).not.toBeInTheDocument();
    expect(screen.queryByText("PDF")).not.toBeInTheDocument();
    expect(screen.queryByText("File")).not.toBeInTheDocument();
  });

  it("selecting a type renders the ItemForm, and submitting creates the item and navigates", async () => {
    const createItem = vi.fn().mockResolvedValue("new-id");
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
      createItem,
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      isOnline: true,
      conflicts: [],
      resolveConflict: vi.fn(),
    });
    render(<NewItemPage />);

    fireEvent.click(screen.getByText("Secure Note"));
    expect(screen.getByLabelText("Title")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My note" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => {
      expect(createItem).toHaveBeenCalledWith(
        "secureNote",
        expect.objectContaining({ type: "secureNote", title: "My note" }),
      );
    });
    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith("/item/new-id");
    });
  });
});
