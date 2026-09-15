import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DecryptedVaultItem } from "@kryvex/vault";
import EditItemPage from "./page";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
  useParams: () => ({ id: "item1" }),
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

function loginItem(): DecryptedVaultItem {
  return {
    id: "item1",
    ownerId: "1",
    type: "login",
    revision: 0,
    updatedAt: null,
    createdAt: null,
    deleted: false,
    favorite: false,
    wrappedItemKey: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
    encryptedData: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
    attachmentRefs: [],
    decryptFailed: false,
    content: {
      type: "login",
      title: "GitHub",
      tags: [],
      customFields: [],
      username: "alice",
      password: "hunter2",
      websites: [],
    },
  };
}

describe("EditItemPage", () => {
  it("pre-fills the form from the existing item and submits an update", async () => {
    const updateItem = vi.fn().mockResolvedValue(undefined);
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
    mockedUseVaultItems.mockReturnValue({
      items: [loginItem()],
      loading: false,
      loadError: null,
      createItem: vi.fn(),
      updateItem,
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      isOnline: true,
      conflicts: [],
      resolveConflict: vi.fn(),
    });

    render(<EditItemPage />);
    expect(screen.getByLabelText("Title")).toHaveValue("GitHub");

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "GitHub (work)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith(
        "item1",
        expect.objectContaining({ title: "GitHub (work)" }),
      );
    });
    await vi.waitFor(() => {
      expect(push).toHaveBeenCalledWith("/item/item1");
    });
  });

  it("allows editing title/tags/notes for an attachment item without an attachmentId field, and preserves attachmentId on submit", async () => {
    const updateItem = vi.fn().mockResolvedValue(undefined);
    const imageItem: DecryptedVaultItem = {
      id: "item1",
      ownerId: "1",
      type: "image",
      revision: 0,
      updatedAt: null,
      createdAt: null,
      deleted: false,
      favorite: false,
      wrappedItemKey: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
      encryptedData: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
      attachmentRefs: ["att1"],
      decryptFailed: false,
      content: {
        type: "image",
        title: "Passport photo",
        tags: [],
        customFields: [],
        attachmentId: "att1",
      },
    };
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
    mockedUseVaultItems.mockReturnValue({
      items: [imageItem],
      loading: false,
      loadError: null,
      createItem: vi.fn(),
      updateItem,
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      isOnline: true,
      conflicts: [],
      resolveConflict: vi.fn(),
    });

    render(<EditItemPage />);
    expect(screen.getByLabelText("Title")).toHaveValue("Passport photo");
    expect(screen.queryByLabelText("File")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Passport photo (renamed)" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await vi.waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith(
        "item1",
        expect.objectContaining({
          title: "Passport photo (renamed)",
          attachmentId: "att1",
        }),
      );
    });
  });

  it("shows not-found for an unknown id", () => {
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
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      loadError: null,
      createItem: vi.fn(),
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
      isOnline: true,
      conflicts: [],
      resolveConflict: vi.fn(),
    });
    render(<EditItemPage />);
    expect(screen.getByText("Item not found.")).toBeInTheDocument();
  });
});
