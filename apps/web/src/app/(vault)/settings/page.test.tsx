import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";
import { useVault } from "@/providers/VaultProvider";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push }),
}));

vi.mock("@/providers/VaultProvider", () => ({
  useVault: vi.fn(),
}));

const mockedUseVault = vi.mocked(useVault);

const UNLOCKED_STATE = {
  status: "UNLOCKED" as const,
  user: { uid: "1", email: "a@b.com" },
  stretchedMasterKey: new Uint8Array(),
  vaultEncryptionKey: new Uint8Array(),
};

function mockVault(overrides: Partial<ReturnType<typeof useVault>> = {}) {
  mockedUseVault.mockReturnValue({
    state: UNLOCKED_STATE,
    signUp: vi.fn(),
    signIn: vi.fn(),
    unlock: vi.fn(),
    lock: vi.fn(),
    recoverVault: vi.fn(),
    settings: {
      autoLockMinutes: 5,
      clipboardClearSeconds: 30,
      biometricUnlockEnabled: false,
    },
    updateSettings: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  });
}

describe("SettingsPage", () => {
  it("loads the current settings into the form", () => {
    mockVault();
    render(<SettingsPage />);
    expect(screen.getByLabelText(/lock after inactivity/i)).toHaveTextContent(
      "5 minutes",
    );
    expect(screen.getByLabelText(/clear clipboard after/i)).toHaveTextContent(
      "30 seconds",
    );
  });

  it("saves changes via updateSettings", async () => {
    const updateSettings = vi.fn().mockResolvedValue(undefined);
    mockVault({ updateSettings });
    render(<SettingsPage />);

    fireEvent.click(screen.getByLabelText(/lock after inactivity/i));
    fireEvent.click(screen.getByRole("option", { name: "1 minute" }));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Settings saved.")).toBeInTheDocument();
    expect(updateSettings).toHaveBeenCalledWith({
      autoLockMinutes: 1,
      clipboardClearSeconds: 30,
      biometricUnlockEnabled: false,
    });
  });

  it("shows an error when saving fails", async () => {
    const updateSettings = vi.fn().mockRejectedValue(new Error("boom"));
    mockVault({ updateSettings });
    render(<SettingsPage />);

    fireEvent.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("boom")).toBeInTheDocument();
  });
});
