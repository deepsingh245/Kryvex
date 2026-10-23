# Kryvex Chrome Extension

Manifest V3 client for save, update, click-to-fill, encrypted offline cache,
and Firestore sync. The cryptographic and document formats are shared with the
Kryvex web and mobile clients; the extension does not define a second vault.

## Configure

The extension needs its own `apps/extension/.env.local` because WXT only
bundles `WXT_*` variables; it does not automatically reuse the web app's
`NEXT_PUBLIC_*` variables. When using the deployed Firebase project, copy the
same public Firebase web configuration with the corresponding `WXT_*` names
and set `WXT_USE_FIREBASE_EMULATOR=false`. You do not need to run local Firebase
emulators in that configuration.

`WXT_KRYVEX_WEB_ORIGIN` must be the exact trusted deployed web origin used for
conflict resolution. Production configuration must use HTTPS. After changing
environment values, rebuild the extension and reload its card from
`chrome://extensions`.

The Firebase Auth provider must allow email/password sign-in. Do not enforce
Firebase App Check for extension-required endpoints until a supported Chrome
extension attestation design or an explicitly reviewed exception exists.

## Develop

```bash
pnpm --filter @kryvex/extension dev
```

Development adds only `http://localhost/*` and `http://127.0.0.1/*` to the
HTTPS sites supported by production.

## Load the unpacked extension in Chrome

1. Build the extension from the repository root:

   ```bash
   pnpm --filter @kryvex/extension build
   ```

2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** in the top-right corner.
4. Select **Load unpacked**.
5. Choose this directory, not the ZIP file or its parent directory:

   ```text
   C:\Users\simra\Documents\repos\Kryvex\apps\extension\.output\chrome-mv3
   ```

6. Confirm that **Kryvex** appears without an error. You can pin it from
   Chrome's Extensions menu for easier access.
7. Open the Kryvex popup, sign in, and unlock the vault with your master
   password. Authentication alone does not unlock vault contents.

For localhost testing, keep the development command running and load
`.output/chrome-mv3-dev/` instead. If it was already loaded, select the reload
button on the Kryvex card in `chrome://extensions` after rebuilding.

### Quick manual test

1. Use a test account and test credentials rather than a real password.
2. Visit an HTTPS page containing a username/email and password form.
3. Confirm that Kryvex places an icon beside an eligible field but does not
   fill or submit anything automatically.
4. Select the icon and choose a matching credential to verify click-to-fill.
5. While the vault is unlocked, submit a new test login and verify the Kryvex
   Save prompt. Save it, then confirm that it appears in the web or mobile
   vault after synchronization.
6. Change that test password and verify that Kryvex offers Update or Save as
   new. Lock the vault and confirm that filling and capture require unlocking.

The extension does not run on `chrome://` pages, production HTTP pages, or in
incognito mode. If no icon appears, first confirm that the page is HTTPS, the
form contains a supported login field, and the extension is enabled for the
site.

## Verify and package

```bash
pnpm --filter @kryvex/extension typecheck
pnpm --filter @kryvex/extension lint
pnpm --filter @kryvex/extension test
pnpm --filter @kryvex/extension test:e2e
pnpm --filter @kryvex/extension build
pnpm --filter @kryvex/extension zip
```

- Unpacked output: `.output/chrome-mv3/`
- Chrome Web Store archive: `.output/kryvexextension-0.1.0-chrome.zip`

The ZIP must be rebuilt from a clean, reviewed commit immediately before
submission. Follow [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md).
