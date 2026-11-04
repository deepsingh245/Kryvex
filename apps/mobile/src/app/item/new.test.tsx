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
  newItemId: () => "item-1",
}));

const mockCreateAttachment = jest.fn();
jest.mock("@/hooks/useAttachments", () => ({
  useCreateAttachment: () => mockCreateAttachment,
}));

const mockPickFile = jest.fn();
jest.mock("@/lib/attachmentFiles", () => ({
  ...jest.requireActual("@/lib/attachmentFiles"),
  pickFile: (...args: unknown[]) => mockPickFile(...args),
}));

beforeEach(() => {
  mockCreateAttachment.mockReset();
  mockPickFile.mockReset();
  mockReplace.mockReset();
});

const mockedUseVault = jest.mocked(useVault);
const mockedUseVaultItems = jest.mocked(useVaultItems);

const UNLOCKED_STATE = {
  status: "UNLOCKED" as const,
  user: { uid: "1", email: "a@b.com" },
  stretchedMasterKey: new Uint8Array(),
  vaultEncryptionKey: new Uint8Array(),
};

describe("NewItemScreen", () => {
  it("shows the type picker, including attachment types", async () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      unlockWithBiometric: jest.fn(),
      enableBiometric: jest.fn(),
      disableBiometric: jest.fn(),
      lock: jest.fn(),
      signOut: jest.fn(),
      settings: undefined,
      reportActivity: jest.fn(),
      updateSettings: jest.fn(),
      regenerateRecoveryKey: jest.fn(),
      sendRecoveryEmail: jest.fn(),
      recoverVault: jest.fn(),
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
    await render(<NewItemScreen />);
    expect(screen.getByText("Login")).toBeTruthy();
    expect(screen.getByText("Custom")).toBeTruthy();
    expect(screen.getByText("Image")).toBeTruthy();
    expect(screen.getByText("PDF")).toBeTruthy();
    expect(screen.getByText("File")).toBeTruthy();
  });

  it("an Image item uploads the picked file under the new item's id, then creates the item", async () => {
    const createItem = jest.fn().mockResolvedValue("item-1");
    mockCreateAttachment.mockResolvedValue("att-1");
    mockPickFile.mockResolvedValue({
      uri: "file:///cache/photo.jpg",
      name: "photo.jpg",
      mimeType: "image/jpeg",
      size: 1234,
    });
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
    } as unknown as ReturnType<typeof useVault>);
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      createItem,
    } as unknown as ReturnType<typeof useVaultItems>);
    await render(<NewItemScreen />);

    await fireEvent.press(screen.getByText("Image"));
    await fireEvent.changeText(screen.getByLabelText("Title"), "Passport");
    await fireEvent.press(screen.getByText("Choose photo"));
    await screen.findByText("photo.jpg");
    await fireEvent.press(screen.getByText("Upload"));

    await waitFor(() => {
      expect(createItem).toHaveBeenCalledWith(
        "image",
        expect.objectContaining({
          type: "image",
          title: "Passport",
          attachmentId: "att-1",
        }),
        ["att-1"],
        "item-1",
      );
    });
    expect(mockCreateAttachment).toHaveBeenCalledWith(
      expect.objectContaining({ name: "photo.jpg" }),
      "item-1",
    );
    expect(mockReplace).toHaveBeenCalledWith("/item/item-1");
  });

  it("refuses to upload without a file", async () => {
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
    } as unknown as ReturnType<typeof useVault>);
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      createItem: jest.fn(),
    } as unknown as ReturnType<typeof useVaultItems>);
    await render(<NewItemScreen />);

    await fireEvent.press(screen.getByText("PDF"));
    await fireEvent.changeText(screen.getByLabelText("Title"), "Lease");
    await fireEvent.press(screen.getByText("Upload"));
    expect(screen.getByText("Choose a file.")).toBeTruthy();
    expect(mockCreateAttachment).not.toHaveBeenCalled();
  });

  it("selecting a type renders the ItemForm, and submitting creates the item and navigates", async () => {
    const createItem = jest.fn().mockResolvedValue("new-id");
    mockedUseVault.mockReturnValue({
      state: UNLOCKED_STATE,
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      unlockWithBiometric: jest.fn(),
      enableBiometric: jest.fn(),
      disableBiometric: jest.fn(),
      lock: jest.fn(),
      signOut: jest.fn(),
      settings: undefined,
      reportActivity: jest.fn(),
      updateSettings: jest.fn(),
      regenerateRecoveryKey: jest.fn(),
      sendRecoveryEmail: jest.fn(),
      recoverVault: jest.fn(),
    });
    mockedUseVaultItems.mockReturnValue({
      items: [],
      loading: false,
      createItem,
      updateItem: jest.fn(),
      toggleFavorite: jest.fn(),
      softDeleteItem: jest.fn(),
      isOnline: true,
      conflicts: [],
      resolveConflict: jest.fn(),
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
