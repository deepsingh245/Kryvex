import "@/polyfills";
import type { ReactNode } from "react";
import { Stack } from "expo-router";
import { PrivacyGuard } from "@/components/PrivacyGuard";
import { useVault, VaultProvider } from "@/providers/VaultProvider";

/**
 * Screens: sign-up (with Emergency Kit), sign-in, unlock, recover /
 * recover-confirm, index (gated home), settings — see docs/ARCHITECTURE.md
 * §5. PrivacyGuard wraps everything: capture protection, the app-switcher
 * cover, and the touch signal that resets the auto-lock idle timer.
 */
export default function RootLayout() {
  return (
    <VaultProvider>
      <GuardedApp>
        <Stack screenOptions={{ headerShown: false }} />
      </GuardedApp>
    </VaultProvider>
  );
}

function GuardedApp({ children }: { children: ReactNode }) {
  const { reportActivity } = useVault();
  return <PrivacyGuard onTouch={reportActivity}>{children}</PrivacyGuard>;
}
