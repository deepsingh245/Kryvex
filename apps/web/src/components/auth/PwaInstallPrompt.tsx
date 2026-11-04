"use client";

import { Download } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button } from "@kryvex/ui";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const subscribeToDisplayMode = (onChange: () => void) => {
  const media = window.matchMedia("(display-mode: standalone)");
  media.addEventListener("change", onChange);
  window.addEventListener("appinstalled", onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener("appinstalled", onChange);
  };
};

const isMobileDevice = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const isAppInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches;

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(
    null,
  );
  const [iosInstructions, setIosInstructions] = useState(false);
  const isMobile = useSyncExternalStore(
    () => () => undefined,
    isMobileDevice,
    () => false,
  );
  const installed = useSyncExternalStore(
    subscribeToDisplayMode,
    isAppInstalled,
    () => false,
  );

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  if (!isMobile || installed) return null;
  if (installEvent) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          await installEvent.prompt();
          await installEvent.userChoice;
          setInstallEvent(null);
        }}
      >
        <Download className="mr-2 h-4 w-4" />
        Install Kryvex
      </Button>
    );
  }
  if (
    /iPhone|iPad|iPod/i.test(
      typeof navigator === "undefined" ? "" : navigator.userAgent,
    )
  ) {
    return (
      <div className="text-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIosInstructions((shown) => !shown)}
        >
          <Download className="mr-2 h-4 w-4" />
          Add Kryvex to Home Screen
        </Button>
        {iosInstructions && (
          <p className="mt-2 max-w-xs text-xs text-text-secondary">
            In Safari, tap Share, then “Add to Home Screen.”
          </p>
        )}
      </div>
    );
  }
  return null;
}
