import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DecryptedVaultItem } from "@kryvex/vault";
import ItemDetailPage from "./page";
import { useAttachment } from "@/hooks/useAttachment";
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

vi.mock("@/hooks/useAttachment", () => ({
  useAttachment: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);
const mockedUseVaultItems = vi.mocked(useVaultItems);
const mockedUseAttachment = vi.mocked(useAttachment);

const UNLOCKED_STATE = {
  status: "UNLOCKED" as const,
  user: { uid: "1", email: "a@b.com" },
  stretchedMasterKey: new Uint8Array(),
  vaultEncryptionKey: new Uint8Array(),
};

function loginItem(overridesFavorite = false): DecryptedVaultItem {
  return {
    id: "item1",
    ownerId: "1",
    type: "login",
    revision: 0,
    updatedAt: null,
    createdAt: null,
    deleted: false,
    favorite: overridesFavorite,
    wrappedItemKey: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
    encryptedData: { v: 1, alg: "AES-256-GCM", nonce: "n", ciphertext: "c" },
    attachmentRefs: [],
    decryptFailed: false,
    content: {
      type: "login",
      title: "GitHub",
      tags: ["work"],
      customFields: [],
      username: "alice",
      password: "hunter2",
      websites: [],
    },
  };
}

function imageItem(): DecryptedVaultItem {
  return {
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
}

function decryptFailedItem(): DecryptedVaultItem {
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
    decryptFailed: true,
  };
}

function setup(
  items: DecryptedVaultItem[],
  overrides: Partial<ReturnType<typeof useVaultItems>> = {},
) {
  mockedUseVault.mockReturnValue({
    state: UNLOCKED_STATE,
    signUp: vi.fn(),
    signIn: vi.fn(),
    unlock: vi.fn(),
    signOut: vi.fn(),
  });
  mockedUseVaultItems.mockReturnValue({
    items,
    loading: false,
    createItem: vi.fn(),
    updateItem: vi.fn(),
    toggleFavorite: vi.fn(),
    softDeleteItem: vi.fn(),
    isOnline: true,
    conflicts: [],
    resolveConflict: vi.fn(),
    ...overrides,
  });
}

describe("ItemDetailPage", () => {
  it("renders decrypted item content", () => {
    setup([loginItem()]);
    render(<ItemDetailPage />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("work")).toBeInTheDocument();
  });

  it("shows the decrypt-failure state instead of throwing", () => {
    setup([decryptFailedItem()]);
    render(<ItemDetailPage />);
    expect(screen.getAllByText("Unable to decrypt").length).toBeGreaterThan(0);
  });

  it("shows a not-found state for an unknown id", () => {
    setup([]);
    render(<ItemDetailPage />);
    expect(screen.getByText("Item not found.")).toBeInTheDocument();
  });

  it("toggling favorite calls toggleFavorite with the item id", () => {
    const toggleFavorite = vi.fn();
    setup([loginItem()], { toggleFavorite });
    render(<ItemDetailPage />);
    fireEvent.click(screen.getByLabelText("Favorite"));
    expect(toggleFavorite).toHaveBeenCalledWith("item1");
  });

  it("renders an AttachmentPreview for image/pdf/file items", () => {
    mockedUseAttachment.mockReturnValue({
      metadata: {
        fileName: "passport.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 2048,
      },
      loading: false,
      error: null,
      loadContent: vi.fn(),
    });
    setup([imageItem()]);
    render(<ItemDetailPage />);
    expect(mockedUseAttachment).toHaveBeenCalledWith("att1");
    expect(screen.getByText(/passport\.jpg/)).toBeInTheDocument();
  });

  it("shows a loading state for the attachment while metadata is still fetching", () => {
    mockedUseAttachment.mockReturnValue({
      metadata: undefined,
      loading: true,
      error: null,
      loadContent: vi.fn(),
    });
    setup([imageItem()]);
    render(<ItemDetailPage />);
    expect(screen.getAllByText("Loading…").length).toBeGreaterThan(0);
  });
});
