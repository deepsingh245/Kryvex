import { test, expect, chromium, type BrowserContext } from "@playwright/test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

let context: BrowserContext | undefined;

test.beforeAll(async () => {
  const extensionPath = resolve(".output/chrome-mv3-dev");
  const userDataDir = await mkdtemp(join(tmpdir(), "kryvex-extension-e2e-"));
  context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });
  if (context.serviceWorkers().length === 0) {
    await context.waitForEvent("serviceworker");
  }
});

test.afterAll(async () => {
  await context?.close();
});

test("injects into the top frame, detects SPA fields, and stays out of iframes", async ({
  baseURL,
}) => {
  const page = await context!.newPage();
  await page.goto(`${baseURL}/login.html`);

  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelectorAll("[data-kryvex-ui='true']").length,
      ),
    )
    .toBeGreaterThanOrEqual(1);

  const frame = page
    .frames()
    .find((candidate) => candidate !== page.mainFrame());
  expect(frame).toBeTruthy();
  await expect
    .poll(() =>
      frame!.evaluate(
        () => document.querySelectorAll("[data-kryvex-ui='true']").length,
      ),
    )
    .toBe(0);

  const beforeSpa = await page.evaluate(
    () => document.querySelectorAll("[data-kryvex-ui='true']").length,
  );
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>("#add-spa-field")?.click();
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelectorAll("[data-kryvex-ui='true']").length,
      ),
    )
    .toBeGreaterThan(beforeSpa);
});

test("does not retain a submitted password while locked", async ({
  baseURL,
}) => {
  const page = await context!.newPage();
  await page.goto(`${baseURL}/login.html`);
  await page.getByLabel("Email address").fill("person@example.com");
  await page.getByLabel("Password").fill("fixture-secret-never-persist");
  await page.getByRole("button", { name: "Continue securely" }).click();

  await expect
    .poll(() =>
      page.evaluate(
        () => document.querySelectorAll("[data-kryvex-ui='true']").length,
      ),
    )
    .toBeGreaterThanOrEqual(2);

  const worker = context!.serviceWorkers()[0];
  expect(worker).toBeTruthy();
  const extensionStorage = await worker!.evaluate(async () =>
    JSON.stringify({
      local: await chrome.storage.local.get(null),
      session: await chrome.storage.session.get(null),
    }),
  );
  expect(extensionStorage).not.toContain("fixture-secret-never-persist");
});
