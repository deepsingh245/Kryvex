# Kryvex Chrome Extension Privacy Disclosure

Last updated: 2026-10-23

Kryvex saves and fills login credentials only after the user interacts with a
Kryvex control or submits an eligible login form while the vault is unlocked.
The extension does not read or import passwords from Chrome Password Manager.

## Data handled

- Page context: the exact hostname is used locally to find matching logins.
- Submitted login data: username/email and password are read only at the
  trusted submit interaction, then immediately encrypted locally when the
  vault is unlocked. While locked, Kryvex does not read or retain them.
- Vault data: encrypted item envelopes and sync metadata are stored locally
  and synced to the user's Firebase-backed Kryvex vault.
- Authentication: Firebase persists the signed-in account session. This does
  not unlock or decrypt the vault.

Kryvex does not sell data, use it for advertising, or send plaintext vault
content to Kryvex servers, analytics, crash reporting, or third parties.

## Site access rationale

Kryvex requests access to HTTPS pages because login forms can appear on any
site chosen by the user. That access is used only to detect eligible credential
fields, show the Kryvex icon and save prompt, and fill a credential after an
explicit click. Kryvex does not inspect browsing history, continuously collect
field values, automatically submit forms, or run on browser-internal pages.

## Local storage

The unwrapped vault key exists only in trusted `chrome.storage.session` while
the vault is unlocked and is cleared by lock, sign-out, restart/update, invalid
session state, or inactivity timeout. IndexedDB stores ciphertext envelopes,
encrypted pending writes, and encrypted conflict records only. Theme choice is
the only non-secret preference in `chrome.storage.local`.

## User controls

Users can lock or sign out from the popup at any time. Removing the extension
deletes its local extension storage. Deleting or changing a synced vault item
uses the Kryvex web or mobile application and follows the account's normal sync
and retention behavior.

Before publishing, replace this paragraph with the operator's legal identity,
support email, privacy-policy URL, applicable retention details, and account
deletion instructions. This repository document is release copy, not legal
advice.
