// Shared flat ESLint config for every Kryvex package/app.
//
// docs/DEVELOPMENT.md §6 / CLAUDE.md §3: raw console.* is banned everywhere
// except packages/security (the sanctioned home of secureLogger) and test
// files, so that accidental logging of vault objects/secrets can't slip in
// silently. Do not weaken this rule to "warn" — it must fail CI.
//
// Deliberately does NOT register eslint-plugin-import: apps/web layers
// eslint-config-next on top of this, which registers its own "import"
// plugin instance — flat config throws ("Cannot redefine plugin") if two
// configs in the same array both declare a plugin under the same name.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.expo/**",
      "**/coverage/**",
      "**/node_modules/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.es2022 },
    },
    rules: {
      "no-console": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"],
    rules: {
      "no-console": "off",
    },
  },
  prettier,
);
