import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    // Matches tsconfig.json's "@/*" -> "./src/*" path alias (Next.js
    // convention) — Vitest/Vite don't read tsconfig "paths" automatically.
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
