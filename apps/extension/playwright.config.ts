import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4317",
  },
  webServer: {
    command: "node tests/fixtures/server.mjs",
    port: 4317,
    reuseExistingServer: false,
  },
});
