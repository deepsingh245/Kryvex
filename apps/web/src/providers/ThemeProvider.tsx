"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import { THEME_STORAGE_KEY, type ThemePreference } from "@/lib/theme";

export type { ThemePreference };

interface ThemeContextValue {
  preference: ThemePreference;
  /** What is actually on screen right now. */
  resolved: "light" | "dark";
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: "system",
  resolved: "dark",
  setPreference: () => {},
});

const listeners = new Set<() => void>();

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Storage unavailable (private mode, blocked) — fall back to system.
  }
  return "system";
}

function subscribePreference(onChange: () => void) {
  listeners.add(onChange);
  // Keeps multiple tabs in step.
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function subscribeSystem(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const mql = window.matchMedia("(prefers-color-scheme: light)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

function systemPrefersLight(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: light)").matches
  );
}

function applyToDocument(next: ThemePreference) {
  const root = document.documentElement;
  if (next === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", next);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribePreference,
    readStoredPreference,
    () => "system",
  );
  const systemLight = useSyncExternalStore(
    subscribeSystem,
    systemPrefersLight,
    () => false,
  );

  const setPreference = useCallback((next: ThemePreference) => {
    applyToDocument(next);
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Preference just won't persist.
    }
    listeners.forEach((l) => l());
  }, []);

  const resolved: "light" | "dark" =
    preference === "system" ? (systemLight ? "light" : "dark") : preference;

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
