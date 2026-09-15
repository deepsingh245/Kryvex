import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SettingsPage from "./page";
import { useVault } from "@/providers/VaultProvider";

const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace, push }),
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
    expect(screen.getByLabelText(/lock after inactivity/i)).toHaveValue("5");
    expect(screen.getByLabelText(/clear clipboard after/i)).toHaveValue("30");
  });

  it("saves changes via updateSettings", async () => {
    const updateSettings = vi.fn().mockResolvedValue(undefined);
    mockVault({ updateSettings });
    render(<SettingsPage />);

    fireEvent.change(screen.getByLabelText(/lock after inactivity/i), {
      target: { value: "1" },
    });
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

  it("redirects to /sign-in when SIGNED_OUT", () => {
    mockVault({ state: { status: "SIGNED_OUT" } });
    render(<SettingsPage />);
    expect(replace).toHaveBeenCalledWith("/sign-in");
  });

  it("redirects to /unlock when AUTHENTICATED_LOCKED", () => {
    mockVault({
      state: {
        status: "AUTHENTICATED_LOCKED",
        user: { uid: "1", email: "a@b.com" },
      },
    });
    render(<SettingsPage />);
    expect(replace).toHaveBeenCalledWith("/unlock");
  });
});
