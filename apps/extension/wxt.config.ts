import { defineConfig } from "wxt";
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: ({ mode }) => ({
    name: "Kryvex - Private Password Vault",
    short_name: "Kryvex",
    description:
      "Save and fill credentials from your zero-knowledge encrypted Kryvex vault.",
    version: "0.1.0",
    minimum_chrome_version: "127",
    permissions: ["storage", "alarms"],
    incognito: "not_allowed",
    icons: {
      16: "brand/kryvex-mark.png",
      32: "brand/kryvex-mark.png",
      48: "brand/kryvex-mark.png",
      128: "brand/kryvex-mark.png",
    },
    action: {
      default_title: "Open Kryvex",
      default_icon: {
        16: "brand/kryvex-mark.png",
        32: "brand/kryvex-mark.png",
      },
    },
    web_accessible_resources: [
      {
        resources: ["brand/kryvex-mark.png"],
        matches: [
          "https://*/*",
          ...(mode === "development"
            ? ["http://localhost/*", "http://127.0.0.1/*"]
            : []),
        ],
      },
    ],
  }),
});
