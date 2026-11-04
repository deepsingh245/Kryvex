import { useEffect, useState, type ReactNode } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";
import * as ScreenCapture from "expo-screen-capture";
import { KRYVEX_BRAND_COLOR } from "@kryvex/ui";
import { BrandLogo } from "@/components/BrandLogo";

/**
 * Screenshot / screen-recording / app-switcher protection — always on, for
 * the whole app (decision: PLAN.md §5's open risk resolved as "every
 * screen"; a password manager has no screen worth exempting).
 *
 * - Android: preventScreenCaptureAsync sets FLAG_SECURE — blocks
 *   screenshots and recording and blanks the recents thumbnail.
 * - iOS: screenshots can't be blocked by any app. preventScreenCapture hides
 *   content from recordings/mirroring; app-switcher protection blurs the
 *   snapshot; the opaque cover below is the fallback for both platforms
 *   whenever the app isn't "active".
 */
export function PrivacyGuard({
  children,
  onTouch,
}: {
  children: ReactNode;
  onTouch: () => void;
}) {
  const [covered, setCovered] = useState(AppState.currentState !== "active");

  useEffect(() => {
    void ScreenCapture.preventScreenCaptureAsync().catch(() => undefined);
    if (Platform.OS === "ios") {
      void ScreenCapture.enableAppSwitcherProtectionAsync().catch(
        () => undefined,
      );
    }
    const subscription = AppState.addEventListener("change", (next) => {
      setCovered(next !== "active");
    });
    return () => subscription.remove();
  }, []);

  return (
    <View
      style={styles.root}
      // Observes every touch for the auto-lock idle timer without ever
      // claiming the responder, so it never steals a gesture.
      onStartShouldSetResponderCapture={() => {
        onTouch();
        return false;
      }}
    >
      {children}
      {covered && (
        <View style={styles.cover} testID="privacy-cover">
          <BrandLogo size={96} inverse />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  cover: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: KRYVEX_BRAND_COLOR,
    alignItems: "center",
    justifyContent: "center",
  },
});
