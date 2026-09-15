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

function mockVaultItems(
  overrides: Partial<ReturnType<typeof useVaultItems>> = {},
) {
  mockedUseVaultItems.mockReturnValue({
    items: [],
    loading: false,
    loadError: null,
    isOnline: true,
    conflicts: [],
    createItem: vi.fn(),
    updateItem: vi.fn(),
    toggleFavorite: vi.fn(),
    softDeleteItem: vi.fn(),
    resolveConflict: vi.fn(),
    ...overrides,
  });
}

describe("Home", () => {
  it("shows the empty-vault message when UNLOCKED with no items", () => {
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
      lock: vi.fn(),
      recoverVault: vi.fn(),
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    mockVaultItems({ items: [loginItem()] });
    render(<Home />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("shows a conflicts banner when there are unresolved conflicts", () => {
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
    mockVaultItems({
      conflicts: [
        { itemId: "item1", localContent: undefined, serverContent: undefined },
      ],
    });
    render(<Home />);
    expect(screen.getByText(/sync/i)).toBeInTheDocument();
  });

  it("does not show a conflicts banner when there are none", () => {
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
    render(<Home />);
    expect(screen.queryByText(/sync conflict/i)).not.toBeInTheDocument();
  });

  it("shows a load-error banner when the item listener fails", () => {
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
    mockVaultItems({
      loadError:
        "Unable to sync your vault right now. Showing the last saved copy.",
    });
    render(<Home />);
    expect(
      screen.getByText(
        "Unable to sync your vault right now. Showing the last saved copy.",
      ),
    ).toBeInTheDocument();
  });

  it("does not show a load-error banner when there is none", () => {
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
    render(<Home />);
    expect(screen.queryByText(/unable to sync/i)).not.toBeInTheDocument();
  });

  it("redirects to /welcome when SIGNED_OUT", () => {
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
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
    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/welcome");
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
      lock: vi.fn(),
      recoverVault: vi.fn(),
      settings: undefined,
      updateSettings: vi.fn(),
      signOut: vi.fn(),
    });
    mockVaultItems();
    render(<Home />);
    expect(replace).toHaveBeenCalledWith("/unlock");
  });
});
