import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

// Deliberately does NOT reuse @kryvex/eslint-config/react here: that config
// (like every @kryvex/eslint-config export) registers its own
// typescript-eslint parser/plugin instance, and eslint-config-next's
// `typescript` config registers its own too — flat config throws
// ("Cannot redefine plugin") if two entries in the same array register a
// plugin under the same name. eslint-config-next's typescript/core-web-vitals
// configs already cover TS + React + React Hooks linting on their own; this
// file only layers Kryvex-specific additions on top.
const eslintConfig = [
  ...nextVitals,
  ...nextTs,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
  {
    // NOT "detect" (eslint-config-next's own default): the bundled
    // eslint-plugin-react's auto-detection path calls the removed ESLint 8
    // `context.getFilename()` API and crashes under ESLint 10's flat-config
    // rule context. Pinning avoids that code path — see
    // packages/eslint-config/react.js for the same fix.
    settings: { react: { version: "19.2" } },
    rules: {
      "no-console": "error",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "no-console": "off",
    },
  },
  prettier,
];

export default eslintConfig;
