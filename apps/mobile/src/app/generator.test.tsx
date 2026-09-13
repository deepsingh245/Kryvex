import { render, screen } from "@testing-library/react-native";
// Aliased to MockText (not Text) so it's usable inside the jest.mock()
// factory below: Jest's hoisting forbids a factory referencing an
// out-of-scope variable unless its name starts with "mock" (case
// insensitive); capitalized so JSX still treats it as a component.
import { Text as MockText } from "react-native";
import GeneratorScreen from "./generator";
import { useVault } from "@/providers/VaultProvider";

jest.mock("expo-router", () => ({
  Redirect: () => null,
  // Real Link renders as Text; a mock returning bare children crashes RN's
  // "Text strings must be rendered within a <Text>" invariant whenever the
  // mocked Link sits inside a View.
  Link: ({ children }: { children: React.ReactNode }) => (
    <MockText>{children}</MockText>
  ),
}));

jest.mock("@/providers/VaultProvider", () => ({
  useVault: jest.fn(),
}));

const mockedUseVault = jest.mocked(useVault);

describe("GeneratorScreen", () => {
  it("renders a generated password when signed in", async () => {
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
      signOut: jest.fn(),
    });
    await render(<GeneratorScreen />);
    expect(screen.getByText("Regenerate")).toBeTruthy();
  });
});
