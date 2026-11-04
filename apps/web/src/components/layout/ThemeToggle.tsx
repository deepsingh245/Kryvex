"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@kryvex/ui";
import {
  getNextTheme,
  THEME_CONFIG,
  type ThemePreference,
} from "@/config/theme.config";
import { useTheme } from "@/providers/ThemeProvider";

const THEME_ICONS: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

interface ThemeToggleProps {
  className?: string;
  size?: "default" | "touch";
}

/** Compact one-tap toggle: flips between light and dark. */
export function ThemeToggle({ className, size = "default" }: ThemeToggleProps) {
  const { resolved, setPreference } = useTheme();
  const next = getNextTheme(resolved);
  return (
    <button
      type="button"
      onClick={() => setPreference(next)}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
      className={cn(
        "flex items-center justify-center rounded-md text-text-secondary transition-colors hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "touch" ? "h-11 w-11" : "h-10 w-10",
        className,
      )}
    >
      {resolved === "dark" ? (
        <Sun className="h-5 w-5" strokeWidth={1.75} />
      ) : (
        <Moon className="h-5 w-5" strokeWidth={1.75} />
      )}
    </button>
  );
}

/** Shared top-level placement for full-page layouts such as authentication. */
export function PageThemeToggle({ className }: { className?: string }) {
  return (
    <ThemeToggle
      className={cn(
        "absolute right-5 top-5 z-30 sm:right-8 lg:right-6 lg:top-8 xl:right-7",
        className,
      )}
    />
  );
}

/** Three-way selector (light / dark / system) for settings. */
export function ThemeSelector() {
  const { preference, setPreference } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex gap-1 rounded-md border border-border p-0.5"
    >
      {THEME_CONFIG.options.map(({ value, label }) => {
        const Icon = THEME_ICONS[value];
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={preference === value}
            onClick={() => setPreference(value)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              preference === value
                ? "bg-primary text-primary-foreground"
                : "text-text-secondary hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
