import { Stack } from "expo-router";

/**
 * Phase 1 scaffold only — a single unnamed route (src/app/index.tsx). Real
 * navigation (Onboarding -> Vault Home -> Item Detail -> ...; see
 * docs/ARCHITECTURE.md §5) lands starting Phase 2.
 */
export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
