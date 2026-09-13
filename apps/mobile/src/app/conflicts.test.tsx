import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text as MockText } from "react-native";
import ConflictsScreen from "./conflicts";
import { useVaultItems } from "@/hooks/useVaultItems";
import { useVault } from "@/providers/VaultProvider";

jest.mock("expo-router", () => ({
  Redirect: () => null,
  Link: ({ children }: { children: React.ReactNode }) => (
    <MockText>{children}</MockText>
  ),
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

describe("ConflictsScreen", () => {
  it("shows a no-conflicts message when there are none", async () => {
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
      isOnline: true,
      conflicts: [],
      createItem: jest.fn(),
      updateItem: jest.fn(),
      toggleFavorite: jest.fn(),
      softDeleteItem: jest.fn(),
      resolveConflict: jest.fn(),
    });
    await render(<ConflictsScreen />);
    expect(screen.getByText("No conflicts to review.")).toBeTruthy();
  });

  it("renders both versions and calls resolveConflict for each action", async () => {
    const resolveConflict = jest.fn();
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
      isOnline: true,
      conflicts: [
        {
          itemId: "item1",
          localContent: {
            type: "login",
            title: "Mine",
            tags: [],
            customFields: [],
            username: "u",
            password: "p",
            websites: [],
          },
          serverContent: {
            type: "login",
            title: "Server's",
            tags: [],
            customFields: [],
            username: "u",
            password: "p",
            websites: [],
          },
        },
      ],
      createItem: jest.fn(),
      updateItem: jest.fn(),
      toggleFavorite: jest.fn(),
      softDeleteItem: jest.fn(),
      resolveConflict,
    });
    await render(<ConflictsScreen />);

    expect(screen.getByText("Mine")).toBeTruthy();
    expect(screen.getByText("Server's")).toBeTruthy();

    await fireEvent.press(screen.getByText("Keep mine"));
    expect(resolveConflict).toHaveBeenCalledWith("item1", "keepMine");

    await fireEvent.press(screen.getByText("Keep server's"));
    expect(resolveConflict).toHaveBeenCalledWith("item1", "keepServer");

    await fireEvent.press(screen.getByText("Keep both"));
    expect(resolveConflict).toHaveBeenCalledWith("item1", "keepBoth");
  });
});
