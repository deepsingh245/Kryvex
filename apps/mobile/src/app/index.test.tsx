import { fireEvent, render, screen } from "@testing-library/react-native";
// Aliased to MockText so it's usable inside the jest.mock() factory below —
// see that mock's comment for why.
import { Text as MockText } from "react-native";
import type { DecryptedVaultItem } from "@kryvex/vault";
import HomeScreen from "./index";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

const mockRouterPush = jest.fn();
jest.mock("expo-router", () => ({
  Redirect: () => null,
  // Real Link renders as Text; bare children crashes RN's "Text strings
  // must be rendered within a <Text>" invariant when nested in a View.
  Link: ({ children }: { children: React.ReactNode }) => (
    <MockText>{children}</MockText>
  ),
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn() }),
}));

jest.mock("@/providers/VaultProvider", () => ({
  useVault: jest.fn(),
}));

jest.mock("@/hooks/useVaultItems", () => ({
  useVaultItems: jest.fn(),
}));

const mockedUseVault = jest.mocked(useVault);
const mockedUseVaultItems = jest.mocked(useVaultItems);

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
    isOnline: true,
    conflicts: [],
    createItem: jest.fn(),
    updateItem: jest.fn(),
    toggleFavorite: jest.fn(),
    softDeleteItem: jest.fn(),
    resolveConflict: jest.fn(),
    ...overrides,
  });
}

describe("HomeScreen", () => {
  it("shows the empty-vault message when UNLOCKED with no items", async () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut: jest.fn(),
    });
    mockVaultItems();
    await render(<HomeScreen />);
    expect(screen.getByText("Your vault is empty.")).toBeTruthy();
    expect(screen.getByText("Your vault")).toBeTruthy();
  });

  it("renders decrypted items in the list when UNLOCKED", async () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut: jest.fn(),
    });
    mockVaultItems({ items: [loginItem()] });
    await render(<HomeScreen />);
    expect(screen.getByText("GitHub")).toBeTruthy();
  });

  it("toggling favorite calls toggleFavorite with the item id", async () => {
    const toggleFavorite = jest.fn();
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut: jest.fn(),
    });
    mockVaultItems({ items: [loginItem()], toggleFavorite });
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText("☆"));
    expect(toggleFavorite).toHaveBeenCalledWith("item1");
  });

  it("shows a conflicts banner and navigates to /conflicts when pressed", async () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut: jest.fn(),
    });
    mockVaultItems({
      conflicts: [
        { itemId: "item1", localContent: undefined, serverContent: undefined },
      ],
    });
    await render(<HomeScreen />);
    const banner = screen.getByText(/sync/i);
    expect(banner).toBeTruthy();
    await fireEvent.press(banner);
    expect(mockRouterPush).toHaveBeenCalledWith("/conflicts");
  });

  it("does not show a conflicts banner when there are none", async () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut: jest.fn(),
    });
    mockVaultItems();
    await render(<HomeScreen />);
    expect(screen.queryByText(/sync conflict/i)).toBeNull();
  });

  it("does not render vault content when SIGNED_OUT", async () => {
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut: jest.fn(),
    });
    mockVaultItems();
    await render(<HomeScreen />);
    expect(screen.queryByText("Your vault")).toBeNull();
  });
});
