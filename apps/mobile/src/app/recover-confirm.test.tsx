import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text as MockText } from "react-native";
import RecoverConfirmScreen from "./recover-confirm";
import { useVault } from "@/providers/VaultProvider";

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <MockText>{children}</MockText>
  ),
}));
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));
jest.mock("@/providers/VaultProvider", () => ({
  useVault: jest.fn(),
}));

const mockedUseVault = jest.mocked(useVault);
const STRONG_PASSWORD = "Correct-Horse-Battery-9";

async function fill(link: string, key: string, password: string) {
  await fireEvent.changeText(
    screen.getByLabelText("Recovery email link"),
    link,
  );
  await fireEvent.changeText(screen.getByLabelText("Recovery Key"), key);
  await fireEvent.changeText(
    screen.getByLabelText("New master password"),
    password,
  );
  await fireEvent.changeText(
    screen.getByLabelText("Confirm new master password"),
    password,
  );
  await fireEvent.press(screen.getByText("Recover vault"));
}

describe("RecoverConfirmScreen", () => {
  let recoverVault: jest.Mock;

  beforeEach(() => {
    recoverVault = jest.fn();
    mockedUseVault.mockReturnValue({
      recoverVault,
    } as unknown as ReturnType<typeof useVault>);
  });

  it("passes the oobCode parsed from the pasted link", async () => {
    recoverVault.mockResolvedValue({ recoveryKey: "NEW-KEY" });
    await render(<RecoverConfirmScreen />);
    await fill(
      "https://kryvex.app/recover/confirm?oobCode=code123",
      "OLD-KEY",
      STRONG_PASSWORD,
    );
    expect(recoverVault).toHaveBeenCalledWith(
      "code123",
      "OLD-KEY",
      STRONG_PASSWORD,
    );
    expect(await screen.findByTestId("recovery-key")).toHaveTextContent(
      "NEW-KEY",
    );
  });

  it("rejects a link without a code before calling recoverVault", async () => {
    await render(<RecoverConfirmScreen />);
    await fill("https://kryvex.app/recover/confirm", "KEY", STRONG_PASSWORD);
    expect(recoverVault).not.toHaveBeenCalled();
    expect(
      screen.getByText("Paste the full link from the recovery email."),
    ).toBeOnTheScreen();
  });

  it("surfaces a recovery failure", async () => {
    recoverVault.mockRejectedValue(new Error("Unable to decrypt."));
    await render(<RecoverConfirmScreen />);
    await fill("code123", "WRONG-KEY", STRONG_PASSWORD);
    expect(await screen.findByText("Unable to decrypt.")).toBeOnTheScreen();
  });
});
