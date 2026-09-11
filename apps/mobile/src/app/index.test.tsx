import { fireEvent, render, screen } from "@testing-library/react-native";
import HomeScreen from "./index";
import { useVault } from "@/providers/VaultProvider";

jest.mock("expo-router", () => ({
  Redirect: () => null,
}));

jest.mock("@/providers/VaultProvider", () => ({
  useVault: jest.fn(),
}));

const mockedUseVault = jest.mocked(useVault);

describe("HomeScreen", () => {
  it("renders the empty-vault stub and signs out when UNLOCKED", async () => {
    const signOut = jest.fn();
    mockedUseVault.mockReturnValue({
      state: {
        status: "UNLOCKED",
        user: { uid: "1", email: "a@b.com" },
        stretchedMasterKey: new Uint8Array(),
        vaultEncryptionKey: new Uint8Array(),
      },
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut,
    });

    await render(<HomeScreen />);
    expect(screen.getByText("Your vault is empty")).toBeTruthy();
    fireEvent.press(screen.getByText("Sign out"));
    expect(signOut).toHaveBeenCalled();
  });

  it("does not render vault content when SIGNED_OUT", async () => {
    mockedUseVault.mockReturnValue({
      state: { status: "SIGNED_OUT" },
      signUp: jest.fn(),
      signIn: jest.fn(),
      unlock: jest.fn(),
      signOut: jest.fn(),
    });

    await render(<HomeScreen />);
    expect(screen.queryByText("Your vault is empty")).toBeNull();
  });
});
