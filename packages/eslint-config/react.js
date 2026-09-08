import base from "./base.js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  ...base,
  {
    files: ["**/*.tsx", "**/*.jsx"],
    plugins: { react, "react-hooks": reactHooks },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    // NOT "detect": eslint-plugin-react@7.37.5's auto-detection path calls
    // the removed ESLint 8 `context.getFilename()` API and crashes under
    // ESLint 10's flat-config rule context. Pinning avoids that code path.
    settings: { react: { version: "19.2" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs["recommended-latest"].rules,
      "react/react-in-jsx-scope": "off",
    },
  },
];
