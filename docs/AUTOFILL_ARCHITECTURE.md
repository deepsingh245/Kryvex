# Kryvex - Autofill Architecture

Status: Chrome Manifest V3 extension implemented in `apps/extension` for the
first-release scope. Android Autofill and the iOS Credential Provider remain
future work. See also [DATA_MODEL.md](./DATA_MODEL.md),
[SYNC_ENGINE.md](./SYNC_ENGINE.md), and
[SECURITY_THREAT_MODEL.md](./SECURITY_THREAT_MODEL.md).

## 1. Shared vault contract

The extension is an independent Kryvex client, not a password relay from the
web app. It reuses `LoginContent`, `VaultItemDocument`, the Argon2id -> HKDF ->
wrapped VEK hierarchy, per-item DEKs, validation, Firestore paths, revision
compare-and-swap rules, and the shared sync state machine. The server receives
only the existing ciphertext envelope.

`LoginContent.websites` stores a normalized origin. Matching is by exact
normalized hostname: sibling subdomains do not share credentials. Production
accepts HTTPS only. Development additionally accepts HTTP on `localhost`,
`127.0.0.1`, and `[::1]`. Paths, queries, fragments, and default ports are
removed; Unicode hostnames use the URL parser's ASCII/punycode representation.

## 2. Chrome extension runtime

`apps/extension` uses WXT, React, TypeScript, and Manifest V3:

- The service worker owns Firebase, cryptography, decrypted credential access,
  encrypted IndexedDB cache, pending writes, and conflict bookkeeping.
- The action popup owns sign-in, unlock, lock, manual sync, sign-out, theme,
  and conflict navigation.
- A top-frame content script runs on HTTPS pages. Development builds also run
  on localhost. It detects eligible password forms and renders field icons and
  prompts inside closed Shadow DOM.
- Permissions are limited to `storage` and `alarms`. Site access is supplied by
  the HTTPS content-script match. There is no tabs, cookies, history,
  webRequest, clipboard, notification, native messaging, or external messaging
  permission.
- Incognito, browser-internal pages, production HTTP, and cross-origin iframe
  filling are unsupported.

## 3. Authentication and key custody

Firebase Auth uses `firebase/auth/web-extension`. Its persisted session means
only `AUTHENTICATED_LOCKED`; it never grants vault access by itself. Sign-in or
unlock derives the existing keys from the master password and unwraps the VEK
locally.

The raw VEK is stored only in `chrome.storage.session`, after that storage area
is restricted to `TRUSTED_CONTEXTS`. Content scripts never receive the VEK.
An alarm records the configured inactivity deadline so service-worker
suspension cannot defeat auto-lock. Lock, sign-out, install/update, browser or
extension restart, an invalid auth/session pairing, and timeout clear the VEK,
fill grants, conflict handoff, and encrypted drafts. Key buffers are wiped on a
best-effort basis after each worker operation; JavaScript and browser-managed
storage cannot offer guaranteed physical memory erasure.

IndexedDB contains only encrypted vault documents and serializable sync state.
An explicit persistence guard rejects plaintext credential/key field names.
Five-minute capture drafts are ciphertext plus routing metadata in trusted
session storage, never plaintext.

## 4. Click-to-fill

The content script detects username/email, `current-password`, and
`new-password` fields, including fields inserted by an SPA. It ignores OTP,
PIN, payment, passkey, and general-form fields.

Nothing fills automatically. Clicking the Kryvex field icon requests matches.
The worker returns labels and usernames only, plus a short-lived random grant
bound to the tab, exact origin, and permitted item IDs. A selection consumes
that one-time grant; the worker revalidates tab, top frame, origin, grant,
expiry, and item membership before returning one credential. The content
script uses native input setters and dispatches `input`/`change`; it never
submits the form.

## 5. Save and update capture

The extension reacts to trusted submit, Enter, and submit-button interactions.
It does not stream keystrokes or retain values while locked. When locked it
shows an unlock affordance and the user must unlock and submit again.

While unlocked, unambiguous candidates are immediately encrypted into a
five-minute draft:

- Sign-in: username/email plus current password.
- Sign-up: username/email plus matching new and confirmation passwords.
- Password change: the new password when current/new roles are explicit.
- Ambiguous multi-password forms: no capture and no prompt.

The item remains the shared `login` type. Its default title is the normalized
hostname and `websites` receives only the normalized origin. The decision is:

- no exact-hostname/account match: Save;
- one match with a changed password: Update or Save as new;
- same password: suppress;
- several matches: select one explicitly or Save as new.

Prompts never display the password and reject synthetic clicks. Drafts are
discarded on dismissal, expiry, origin mismatch, lock, or sign-out.

## 6. Offline sync and conflicts

The extension hydrates an encrypted IndexedDB cache, performs a fresh server
reconciliation on worker startup when unlocked, and can fill from the cache
offline. Saves and updates are encrypted before entering the pending queue and
retry later. Revision failures preserve both ciphertext envelopes as a
conflict; they never silently overwrite.

`@kryvex/sync` exposes `importConflict` for the existing web resolver. Resolve
in Kryvex opens the configured web `/conflicts?source=extension` page and
creates a short-lived handoff bound to that newly opened tab and exact Kryvex
origin. Its routing record is kept in trusted `chrome.storage.session`, so a
service-worker restart cannot silently break the extension-opened handoff. A
content-script bridge transfers only the two ciphertext envelopes.
After keep-mine, keep-server, or keep-both succeeds, the web page acknowledges
the conflict ID and the extension removes that record. No plaintext or key is
crossed through `window.postMessage`.

## 7. First-release boundaries

Chrome MV3 only. No Chrome Password Manager import, website password
generation, TOTP fill, passkeys, cards, addresses, automatic fill, automatic
submission, extension biometrics, Firefox/Safari packaging, or mobile OS
autofill. Firebase App Check must not be enforced for extension-required
endpoints until the extension has a supported attestation strategy or a
documented and reviewed exception.

Android Autofill and the iOS Credential Provider must reuse the same item
schema and key hierarchy. Their app/domain association and platform key
custody require separate platform security reviews before implementation.
