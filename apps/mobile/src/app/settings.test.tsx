import { fireEvent, render, screen } from "@testing-library/react-native";
import SettingsScreen from "./settings";
import { useVault } from "@/providers/VaultProvider";

jest.mock("expo-router", () => ({ Redirect: () => null }));
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));
jest.mock("@/lib/biometric", () => ({
  isBiometricSupported: jest.fn(async () => false),
  hasBiometricEnrollment: jest.fn(async () => false),
}));
jest.mock("@/providers/VaultProvider", () => ({
  useVault: jest.fn(),
}));

const mockedUseVault = jest.mocked(useVault);

describe("SettingsScreen", () => {
  let updateSettings: jest.Mock;
  let regenerateRecoveryKey: jest.Mock;

  beforeEach(() => {
    updateSettings = jest.fn(async () => undefined);
    regenerateRecoveryKey = jest.fn();
    mockedUseVault.mockReturnValue({
      state: {
        status: "UNLOCKED",
        user: { uid: "1", email: "a@b.com" },
        stretchedMasterKey: new Uint8Array(),
        vaultEncryptionKey: new Uint8Array(),
      },
      settings: {
        autoLockMinutes: 5,
        clipboardClearSeconds: 30,
        biometricUnlockEnabled: false,
      },
      updateSettings,
      regenerateRecoveryKey,
      enableBiometric: jest.fn(),
      disableBiometric: jest.fn(),
    } as unknown as ReturnType<typeof useVault>);
  });

  it("saves a new auto-lock and clipboard-clear choice", async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByLabelText("Auto-lock: 15 min"));
    expect(updateSettings).toHaveBeenCalledWith({ autoLockMinutes: 15 });
    await fireEvent.press(screen.getByLabelText("Clipboard clear: 60s"));
    expect(updateSettings).toHaveBeenCalledWith({ clipboardClearSeconds: 60 });
  });

  it("requires the master password before creating a Recovery Key", async () => {
    await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText("Create new Recovery Key"));
    expect(regenerateRecoveryKey).not.toHaveBeenCalled();
    expect(screen.getByText("Enter your master password.")).toBeOnTheScreen();
  });

  it("shows the new Emergency Kit after creating a Recovery Key", async () => {
    regenerateRecoveryKey.mockResolvedValue({ recoveryKey: "NEW-KEY" });
    await render(<SettingsScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Master password for Recovery Key"),
      "pw",
    );
    await fireEvent.press(screen.getByText("Create new Recovery Key"));
    expect(regenerateRecoveryKey).toHaveBeenCalledWith("pw");
    expect(await screen.findByTestId("recovery-key")).toHaveTextContent(
      "NEW-KEY",
    );
  });
});
