import base from "@kryvex/eslint-config";

export default [
  {
    ignores: [
      ".output/**",
      ".wxt/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...base,
  {
    languageOptions: {
      globals: {
        chrome: "readonly",
        document: "readonly",
        window: "readonly",
        MutationObserver: "readonly",
        HTMLInputElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLElement: "readonly",
        Event: "readonly",
        KeyboardEvent: "readonly",
        MouseEvent: "readonly",
        location: "readonly",
        navigator: "readonly",
      },
    },
  },
];
