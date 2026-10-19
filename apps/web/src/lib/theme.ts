export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "kryvex-theme";

/**
 * Runs before hydration (see app/layout.tsx) so the first paint already has
 * the right palette. Only a non-sensitive UI preference is stored.
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
