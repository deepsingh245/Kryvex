import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
// Aliased to MockText so it's usable inside the jest.mock() factory below —
// see that mock's comment for why.
import { Text as MockText } from "react-native";
import NewItemScreen from "./new";
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

describe("NewItemScreen", () => {
  it("shows the type picker excluding image/pdf/file", async () => {
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
    });
    await render(<NewItemScreen />);
    expect(screen.getByText("Login")).toBeTruthy();
    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.queryByText("Image")).toBeNull();
    expect(screen.queryByText("PDF")).toBeNull();
    expect(screen.queryByText("File")).toBeNull();
  });

  it("selecting a type renders the ItemForm, and submitting creates the item and navigates", async () => {
    const createItem = jest.fn().mockResolvedValue("new-id");
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
      createItem,
      updateItem: jest.fn(),
      toggleFavorite: jest.fn(),
      softDeleteItem: jest.fn(),
    });
    await render(<NewItemScreen />);

    await fireEvent.press(screen.getByText("Secure Note"));
    expect(screen.getByLabelText("Title")).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText("Title"), "My note");
    await fireEvent.press(screen.getByText("Save"));

    await waitFor(() => {
      expect(createItem).toHaveBeenCalledWith(
        "secureNote",
        expect.objectContaining({ type: "secureNote", title: "My note" }),
      );
    });
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/item/new-id");
    });
  });
});
