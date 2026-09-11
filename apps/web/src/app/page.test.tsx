import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DecryptedVaultItem } from "@kryvex/vault";
import Home from "./page";
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
      username: "u",
      password: "p",
      websites: [],
    },
  };
}

describe("Home", () => {
  it("shows the empty-vault message when UNLOCKED with no items", () => {
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
    });
    render(<Home />);
    expect(screen.getByText("Your vault is empty.")).toBeInTheDocument();
    expect(screen.getByText("Your vault")).toBeInTheDocument();
  });

  it("renders decrypted items in the list when UNLOCKED", () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: vi.fn(),
      signIn: vi.fn(),
      unlock: vi.fn(),
      signOut: vi.fn(),
    });
    mockedUseVaultItems.mockReturnValue({
      items: [loginItem()],
      loading: false,
      createItem: vi.fn(),
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
    });
    render(<Home />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("redirects to /sign-in when SIGNED_OUT", () => {
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
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
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      createItem: vi.fn(),
      updateItem: vi.fn(),
      toggleFavorite: vi.fn(),
      softDeleteItem: vi.fn(),
    });
    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/unlock");
  });
});
