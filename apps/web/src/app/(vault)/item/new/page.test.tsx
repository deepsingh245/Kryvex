import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import NewItemPage from "./page";
import { useCreateAttachment } from "@/hooks/useCreateAttachment";
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
  newItemId: () => "generated-item-id",
}));

vi.mock("@/hooks/useCreateAttachment", () => ({
  useCreateAttachment: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);
const mockedUseVaultItems = vi.mocked(useVaultItems);
const mockedUseCreateAttachment = vi.mocked(useCreateAttachment);

const UNLOCKED_STATE = {
  status: "UNLOCKED" as const,
  user: { uid: "1", email: "a@b.com" },
  stretchedMasterKey: new Uint8Array(),
  vaultEncryptionKey: new Uint8Array(),
};

function mockVaultItems(createItem = vi.fn()) {
  mockedUseVaultItems.mockReturnValue({
    items: [],
    loading: false,
    loadError: null,
    createItem,
    updateItem: vi.fn(),
    toggleFavorite: vi.fn(),
    softDeleteItem: vi.fn(),
    isOnline: true,
    conflicts: [],
    resolveConflict: vi.fn(),
  });
}

describe("NewItemPage", () => {
  it("shows the type picker including image/pdf/file (Phase 6)", () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      recoverVault: vi.fn(),
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    mockVaultItems();
    mockedUseCreateAttachment.mockReturnValue(vi.fn());
    render(<NewItemPage />);
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("File")).toBeInTheDocument();
  });

  it("selecting a type renders the ItemForm, and submitting creates the item and navigates", async () => {
    const createItem = vi.fn().mockResolvedValue("new-id");
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      recoverVault: vi.fn(),
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    mockVaultItems(createItem);
    mockedUseCreateAttachment.mockReturnValue(vi.fn());
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

  it("selecting Image renders the upload form, and submitting encrypts+uploads the attachment then creates the item", async () => {
    const createItem = vi.fn().mockResolvedValue(undefined);
    const createAttachment = vi.fn().mockResolvedValue("att1");
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      lock: vi.fn(),
      recoverVault: vi.fn(),
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    mockVaultItems(createItem);
    mockedUseCreateAttachment.mockReturnValue(createAttachment);
    render(<NewItemPage />);

    fireEvent.click(screen.getByText("Image"));
    expect(screen.getByLabelText("File")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My Photo" },
    });
    const file = new File(["x"], "photo.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("File"), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload" }));

    await vi.waitFor(() => {
      expect(createAttachment).toHaveBeenCalledWith(file, "generated-item-id");
    });
    await vi.waitFor(() => {
      expect(createItem).toHaveBeenCalledWith(
        "image",
        expect.objectContaining({
          type: "image",
          title: "My Photo",
          attachmentId: "att1",
        }),
        ["att1"],
        "generated-item-id",
      );
    });
    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith("/item/generated-item-id");
    });
  });
});
