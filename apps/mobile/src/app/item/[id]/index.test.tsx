import { fireEvent, render, screen } from "@testing-library/react-native";
// Aliased to MockText so it's usable inside the jest.mock() factory below —
// see that mock's comment for why.
import { Text as MockText } from "react-native";
import type { DecryptedVaultItem } from "@kryvex/vault";
import ItemDetailScreen from "./index";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

// This test doesn't assert on navigation, so replace/push are just inlined
// jest.fn()s rather than named outer consts (Jest's jest.mock() factory
// can't reference an out-of-scope const unless its name starts with "mock").
jest.mock("expo-router", () => ({
  Redirect: () => null,
  // Real Link renders as Text; bare children crashes RN's "Text strings
  // must be rendered within a <Text>" invariant when nested in a View.
  Link: ({ children }: { children: React.ReactNode }) => (
    <MockText>{children}</MockText>
  ),
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useLocalSearchParams: () => ({ id: "item1" }),
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

function loginItem(favorite = false): DecryptedVaultItem {
  return {
    id: "item1",
    ownerId: "1",
    type: "login",
    revision: 0,
    updatedAt: null,
    createdAt: null,
    deleted: false,
    favorite,
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
    signUp: jest.fn(),
    signIn: jest.fn(),
    unlock: jest.fn(),
    signOut: jest.fn(),
  });
  mockedUseVaultItems.mockReturnValue({
    items,
    loading: false,
    createItem: jest.fn(),
    updateItem: jest.fn(),
    toggleFavorite: jest.fn(),
    softDeleteItem: jest.fn(),
    isOnline: true,
    conflicts: [],
    resolveConflict: jest.fn(),
    ...overrides,
  });
}

describe("ItemDetailScreen", () => {
  it("renders decrypted item content", async () => {
    setup([loginItem()]);
    await render(<ItemDetailScreen />);
    expect(screen.getByText("GitHub")).toBeTruthy();
    expect(screen.getByText("work")).toBeTruthy();
  });

  it("shows the decrypt-failure state instead of throwing", async () => {
    setup([decryptFailedItem()]);
    await render(<ItemDetailScreen />);
    expect(screen.getAllByText("Unable to decrypt").length).toBeGreaterThan(0);
  });

  it("shows a not-found state for an unknown id", async () => {
    setup([]);
    await render(<ItemDetailScreen />);
    expect(screen.getByText("Item not found.")).toBeTruthy();
  });

  it("toggling favorite calls toggleFavorite with the item id", async () => {
    const toggleFavorite = jest.fn();
    setup([loginItem()], { toggleFavorite });
    await render(<ItemDetailScreen />);
    await fireEvent.press(screen.getByText("☆"));
    expect(toggleFavorite).toHaveBeenCalledWith("item1");
  });
});
