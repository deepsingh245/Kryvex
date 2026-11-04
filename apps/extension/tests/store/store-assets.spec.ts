import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const assetsDirectory = resolve("store-assets");
let context: BrowserContext | undefined;
let extensionId = "";

test.beforeAll(async () => {
  await mkdir(assetsDirectory, { recursive: true });
  const extensionPath = resolve(".output/chrome-mv3-dev");
  const userDataDirectory = await mkdtemp(
    join(tmpdir(), "kryvex-extension-store-"),
  );
  context = await chromium.launchPersistentContext(userDataDirectory, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  extensionId = new URL(worker.url()).host;
});

test.afterAll(async () => {
  await context?.close();
});

test("captures the signed-out popup without real account data", async () => {
  const page = await context!.newPage();
  await page.setViewportSize({ width: 640, height: 400 });
  await page.addInitScript(() => {
    Object.defineProperty(chrome.runtime, "sendMessage", {
      configurable: true,
      value: async (request: { type?: string }) =>
        request.type === "GET_STATUS"
          ? {
              ok: true,
              data: { state: "SIGNED_OUT", conflictCount: 0 },
            }
          : { ok: false, error: "Unavailable in the store preview." },
    });
  });
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(
    page.getByRole("heading", { name: "Sign in to Kryvex" }),
  ).toBeVisible();
  await page.addStyleTag({
    content: `
      html, body { width: 640px !important; height: 400px !important; overflow: hidden; }
      body { background: #080b14 !important; }
      #root { margin: 0 auto; transform: scale(.75); transform-origin: top center; }
    `,
  });
  await page.screenshot({
    path: join(assetsDirectory, "01-popup-signed-out.png"),
    animations: "disabled",
  });
});

test("captures the locked save affordance with synthetic fixture data", async ({
  baseURL,
}) => {
  const page = await context!.newPage();
  await page.goto(`${baseURL}/login.html`);
  await page.getByLabel("Email address").fill("alex@example.test");
  await page.getByLabel("Password").fill("synthetic-screenshot-only");
  await page.getByRole("button", { name: "Continue securely" }).click();

  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelectorAll("[data-kryvex-ui='true']").length,
      ),
    )
    .toBeGreaterThanOrEqual(2);

  await page.screenshot({
    path: join(assetsDirectory, "02-locked-save-affordance.png"),
    animations: "disabled",
  });
});
