# Chrome Web Store Listing Copy

## Name

Kryvex - Private Password Vault

## Short description

Save and click-to-fill logins from your locally encrypted Kryvex vault.

## Detailed description

Kryvex gives your logins one secure home across web, mobile, and Chrome.
Save a credential after signing in, update a changed password, or click the
Kryvex icon in a password field to choose an exact-hostname match.

Your vault is encrypted on your device before it syncs. Signing into a Kryvex
account does not unlock the vault: the extension requires your master password
and locks again after inactivity. Kryvex never imports Chrome Password Manager
data, fills without a click, or submits a form for you.

First-release features:

- Save sign-in and sign-up credentials after a trusted submission.
- Update a matching account or save a separate login.
- Click-only filling with exact-hostname matching.
- Encrypted offline cache and encrypted pending sync.
- Explicit conflict resolution in the Kryvex web app.
- Light and dark themes with keyboard-accessible controls.

## Permission explanations

### Read and change data on websites you visit

Login forms can exist on any site, so Kryvex needs access to HTTPS pages to
locate eligible username/password fields, display its field icon and save
prompt, and fill the login the user selects. It does not collect browsing
history, stream keystrokes, fill automatically, or submit forms.

### Storage

Used for the short-lived unlocked session, encrypted drafts, encrypted offline
cache, sync bookkeeping, and the local theme preference. No plaintext
credential is stored in IndexedDB, local storage, or sync storage.

### Alarms

Used to enforce the configured vault inactivity timeout even when Chrome stops
the Manifest V3 service worker.

## Generated screenshots

The following sanitized assets are generated from the packaged development
extension with `pnpm --filter @kryvex/extension screenshots`:

1. [`store-assets/01-popup-signed-out.png`](store-assets/01-popup-signed-out.png)
   - signed-out popup, with no account data.
2. [`store-assets/02-locked-save-affordance.png`](store-assets/02-locked-save-affordance.png)
   - locked save affordance on a neutral local fixture using synthetic data.

## Staging screenshot plan

Capture the remaining states at 1280x800 or 640x400 after final staging
verification:

1. Popup unlocked state with item and conflict counts.
2. Kryvex field icon and exact-host login chooser on a neutral fixture site.
3. Update-or-save-as-new prompt.
4. Web conflict resolver opened from the extension.

Do not use real accounts, domains, emails, passwords, vault titles, or Firebase
project identifiers in screenshots.
