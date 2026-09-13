import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
// Aliased to MockText so it's usable inside the jest.mock() factory below —
// see that mock's comment for why.
import { Text as MockText } from "react-native";
import type { DecryptedVaultItem } from "@kryvex/vault";
import EditItemScreen from "./edit";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  Redirect: () => null,
  // Real Link renders as Text; bare children crashes RN's "Text strings
  // must be rendered within a <Text>" invariant when nested in a View.
  Link: ({ children }: { children: React.ReactNode }) => (
    <MockText>{children}</MockText>
  ),
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
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

describe("EditItemScreen", () => {
  it("pre-fills the form from the existing item and submits an update", async () => {
    const updateItem = jest.fn().mockResolvedValue(undefined);
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut: jest.fn(),
    });
    mockedUseVaultItems.mockReturnValue({
      items: [loginItem()],
      loading: false,
      createItem: jest.fn(),
      updateItem,
      toggleFavorite: jest.fn(),
      softDeleteItem: jest.fn(),
      isOnline: true,
      conflicts: [],
      resolveConflict: jest.fn(),
    });

    await render(<EditItemScreen />);
    expect(screen.getByLabelText("Title").props.value).toBe("GitHub");

    await fireEvent.changeText(screen.getByLabelText("Title"), "GitHub (work)");
    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith(
        "item1",
        expect.objectContaining({ title: "GitHub (work)" }),
      );
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/item/item1");
    });
  });

  it("shows not-found for an unknown id", async () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut: jest.fn(),
    });
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      createItem: jest.fn(),
      updateItem: jest.fn(),
      toggleFavorite: jest.fn(),
      softDeleteItem: jest.fn(),
      isOnline: true,
      conflicts: [],
      resolveConflict: jest.fn(),
    });
    await render(<EditItemScreen />);
    expect(screen.getByText("Item not found.")).toBeTruthy();
  });
});
