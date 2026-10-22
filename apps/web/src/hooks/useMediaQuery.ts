"use client";

import { useSyncExternalStore } from "react";

/**
 * Subscribes to a CSS media query. Returns false on the server and wherever
 * matchMedia is unavailable (e.g. jsdom), so the mobile layout is the safe
 * default.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () =>
      typeof window.matchMedia === "function"
        ? window.matchMedia(query).matches
        : false,
    () => false,
  );
}

/** Tailwind `md` (768px) and up: tablet and desktop get the dashboard. */
export const useIsTabletUp = () => useMediaQuery("(min-width: 768px)");

/** Tailwind `lg` (1024px) and up: room for the inline detail pane. */
export const useIsDesktopUp = () => useMediaQuery("(min-width: 1024px)");
