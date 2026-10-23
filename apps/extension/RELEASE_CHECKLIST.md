# Chrome Extension Release Checklist

## Build and review

- [ ] Release commit is clean and reviewed; lockfile is committed.
- [ ] `pnpm build`, `pnpm typecheck`, `pnpm lint`, and `pnpm test` pass.
- [ ] Firebase emulator auth/sync/security suites pass.
- [ ] Extension Chromium E2E passes from a fresh persistent browser profile.
- [ ] `pnpm --filter @kryvex/extension zip` produces the reviewed archive.
- [ ] Unzip and inspect the manifest, CSP, scripts, source maps, and bundled
      files; no `.env`, secret, test fixture, or development host is present.

## Security

- [ ] Manifest has only `storage` and `alarms`; production content matches are
      HTTPS only and incognito is disabled.
- [ ] Content script cannot read the VEK and cannot serve a stale tab, origin,
      frame, item, or nonce.
- [ ] Test secrets do not appear in extension logs, URLs, analytics,
      `storage.local`, `storage.sync`, `storage.session` drafts, or IndexedDB.
- [ ] Fill requires a user click and never submits the form.
- [ ] Lock, sign-out, restart/update, invalid session, and auto-lock clear key
      custody and pending drafts.
- [ ] App Check enforcement remains off for extension-required Firebase calls
      unless the release has a separately reviewed extension strategy.

## Store submission

- [ ] Privacy policy is published at a stable HTTPS URL and matches behavior.
- [ ] Broad site-access and each API permission are explained plainly.
- [ ] Store data-use answers disclose authentication, encrypted sync, and
      exact-hostname processing without claiming the extension collects less
      than it actually handles.
- [ ] Listing copy, support URL/email, icons, and five sanitized screenshots
      are final.
- [ ] Manual tests cover sign-in, sign-up, password change, SPA, multi-account,
      locked capture, offline save/fill, restart, timeout, and conflict handoff.
- [ ] Chrome Web Store ZIP version matches `package.json` and the manifest.
