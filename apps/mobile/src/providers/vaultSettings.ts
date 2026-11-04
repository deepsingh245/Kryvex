import { createContext, useContext } from "react";
import type { UserProfileSettings } from "@kryvex/types";

export const DEFAULT_SETTINGS: UserProfileSettings = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  biometricUnlockEnabled: false,
};

// Kept apart from VaultContext so leaf components (SecretField) can read
// settings without requiring a VaultProvider — outside one they just get
// DEFAULT_SETTINGS.
export const VaultSettingsContext = createContext<
  UserProfileSettings | undefined
>(undefined);

export function useEffectiveSettings(): UserProfileSettings {
  return useContext(VaultSettingsContext) ?? DEFAULT_SETTINGS;
}
