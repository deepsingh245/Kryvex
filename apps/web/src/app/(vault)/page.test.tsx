import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DecryptedVaultItem } from "@kryvex/vault";
import Home from "./page";
import { useVaultItems } from "@/hooks/useVaultItems";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/hooks/useVaultItems", () => ({
  useVaultItems: vi.fn(),
}));

const mockedUseVaultItems = vi.mocked(useVaultItems);

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

// SIGNED_OUT/AUTHENTICATED_LOCKED redirect gating is exercised once in
// (vault)/layout.test.tsx — this page no longer has that logic itself.
describe("Home", () => {
  it("shows the empty-vault message with no items", () => {
    mockVaultItems();
    render(<Home />);
    expect(screen.getByText("Your vault is empty.")).toBeInTheDocument();
    expect(screen.getByText("Your vault")).toBeInTheDocument();
  });

  it("renders decrypted items in the list", () => {
    mockVaultItems({ items: [loginItem()] });
    render(<Home />);
    expect(screen.getByText("GitHub")).toBeInTheDocument();
  });

  it("shows a conflicts banner when there are unresolved conflicts", () => {
    mockVaultItems({
      conflicts: [
        { itemId: "item1", localContent: undefined, serverContent: undefined },
      ],
    });
    render(<Home />);
    expect(screen.getByText(/sync/i)).toBeInTheDocument();
  });

  it("does not show a conflicts banner when there are none", () => {
    mockVaultItems();
    render(<Home />);
    expect(screen.queryByText(/sync conflict/i)).not.toBeInTheDocument();
  });

  it("shows a load-error banner when the item listener fails", () => {
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
    mockVaultItems();
    render(<Home />);
    expect(screen.queryByText(/unable to sync/i)).not.toBeInTheDocument();
  });
});
