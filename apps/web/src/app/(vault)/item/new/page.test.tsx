import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewItemPage from "./page";
import { useCreateAttachment } from "@/hooks/useCreateAttachment";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

const replace = vi.fn();
const push = vi.fn();
const searchParamsGet = vi.fn<(key: string) => string | null>(() => null);
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  useSearchParams: () => ({ get: searchParamsGet }),
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

function mockUseVault() {
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
}

describe("NewItemPage", () => {
  beforeEach(() => {
    searchParamsGet.mockReset();
    searchParamsGet.mockImplementation(() => null);
  });

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

  it("skips the type picker and goes straight to the form when ?type= is a concrete type", () => {
    searchParamsGet.mockImplementation((key) =>
      key === "type" ? "email" : null,
    );
    mockUseVault();
    mockVaultItems();
    mockedUseCreateAttachment.mockReturnValue(vi.fn());
    render(<NewItemPage />);

    expect(screen.getByLabelText("Title")).toBeInTheDocument();
    expect(screen.queryByText("Add an item")).not.toBeInTheDocument();
  });

  it("restricts the picker to Image/PDF/File when ?type=files", () => {
    searchParamsGet.mockImplementation((key) =>
      key === "type" ? "files" : null,
    );
    mockUseVault();
    mockVaultItems();
    mockedUseCreateAttachment.mockReturnValue(vi.fn());
    render(<NewItemPage />);

    expect(screen.getByText("Image")).toBeInTheDocument();
    expect(screen.getByText("PDF")).toBeInTheDocument();
    expect(screen.getByText("File")).toBeInTheDocument();
    expect(screen.queryByText("Login")).not.toBeInTheDocument();
    expect(screen.queryByText("Custom")).not.toBeInTheDocument();
    expect(screen.getByText("Cancel").closest("a")).toHaveAttribute(
      "href",
      "/?type=files",
    );
  });

  it("Cancel from a skipped-picker form returns to the filtered category, not the picker", () => {
    searchParamsGet.mockImplementation((key) =>
      key === "type" ? "email" : null,
    );
    mockUseVault();
    mockVaultItems();
    mockedUseCreateAttachment.mockReturnValue(vi.fn());
    render(<NewItemPage />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(push).toHaveBeenCalledWith("/?type=email");
    expect(screen.queryByText("Add an item")).not.toBeInTheDocument();
  });

  it("Cancel from a manually-selected type (no ?type=) returns to the picker", () => {
    mockUseVault();
    mockVaultItems();
    mockedUseCreateAttachment.mockReturnValue(vi.fn());
    render(<NewItemPage />);

    fireEvent.click(screen.getByText("Secure Note"));
    expect(screen.getByLabelText("Title")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Add an item")).toBeInTheDocument();
  });
});
