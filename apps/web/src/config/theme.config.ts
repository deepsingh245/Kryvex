export const THEME_PREFERENCES = ["light", "dark", "system"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];
export type ResolvedTheme = Exclude<ThemePreference, "system">;

/**
 * Single configuration source for theme persistence, labels, defaults, and
 * toggle behavior. Palette values live beside Tailwind's semantic tokens in
 * app/globals.css so components never need theme-specific colors.
 */
interface ThemeConfig {
  storageKey: string;
  defaultPreference: ThemePreference;
  defaultResolvedTheme: ResolvedTheme;
  options: ReadonlyArray<{ value: ThemePreference; label: string }>;
  next: Record<ResolvedTheme, ResolvedTheme>;
}

export const THEME_CONFIG: ThemeConfig = {
  storageKey: "kryvex-theme",
  defaultPreference: "system",
  defaultResolvedTheme: "dark",
  options: [
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
    { value: "system", label: "System" },
  ],
  next: {
    light: "dark",
    dark: "light",
  },
};

export function isResolvedTheme(value: string | null): value is ResolvedTheme {
  return value === "light" || value === "dark";
}

export function getNextTheme(current: ResolvedTheme): ResolvedTheme {
  return THEME_CONFIG.next[current];
}

/** Applies a saved explicit choice before hydration, preventing a theme flash. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_CONFIG.storageKey}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
