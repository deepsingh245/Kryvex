import { describe, expect, it } from "vitest";
import config from "../wxt.config";

async function manifestFor(mode: "production" | "development") {
  const source = config.manifest;
  if (typeof source === "function") {
    return source({
      mode,
      command: "build",
      browser: "chrome",
      manifestVersion: 3,
    });
  }
  return source;
}

describe("production manifest policy", () => {
  it("keeps the privileged permission surface minimal", async () => {
    const manifest = await manifestFor("production");
    expect(manifest).toMatchObject({
      permissions: ["storage", "alarms"],
      incognito: "not_allowed",
    });
    expect(manifest).not.toHaveProperty("host_permissions");
  });

  it("exposes only the packaged brand mark to HTTPS pages", async () => {
    const manifest = await manifestFor("production");
    expect(manifest).toMatchObject({
      web_accessible_resources: [
        {
          resources: ["brand/kryvex-mark.png"],
          matches: ["https://*/*"],
        },
      ],
    });
  });

  it("adds logo access for localhost only in development", async () => {
    const manifest = await manifestFor("development");
    expect(manifest).toMatchObject({
      web_accessible_resources: [
        {
          resources: ["brand/kryvex-mark.png"],
          matches: ["https://*/*", "http://localhost/*", "http://127.0.0.1/*"],
        },
      ],
    });
  });
});
