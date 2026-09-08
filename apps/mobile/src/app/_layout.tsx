import "@/polyfills";
import { Stack } from "expo-router";
import { VaultProvider } from "@/providers/VaultProvider";

/**
 * Screens: sign-up, sign-in, unlock, index (gated home) — see
 * docs/ARCHITECTURE.md §5 for the full future screen map. Recovery kit /
 * biometric opt-in (Phase 3/7) aren't built yet.
 */
export default function RootLayout() {
  return (
    <VaultProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </VaultProvider>
  );
}
