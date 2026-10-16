import "@/polyfills";
import { Stack } from "expo-router";
import { VaultProvider } from "@/providers/VaultProvider";

/**
 * Screens: sign-up, sign-in, unlock, index (gated home) — see
 * docs/ARCHITECTURE.md §5 for the full future screen map. Recovery kit /
 * recovery kit remains deferred; native biometric opt-in is implemented in
 * Settings and backed by Android Keystore / iOS Keychain SecureStore access.
 */
export default function RootLayout() {
  return (
    <VaultProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </VaultProvider>
  );
}
