# Kryvex — Security Threat Model

Status: Phase 0 draft. Governs all subsequent design/implementation decisions.
See also: [CRYPTOGRAPHIC_ARCHITECTURE.md](./CRYPTOGRAPHIC_ARCHITECTURE.md),
[FIREBASE_SECURITY.md](./FIREBASE_SECURITY.md).

## 1. Purpose

Kryvex stores highly sensitive personal data (passwords, secrets, identity
documents, financial info). This document defines what Kryvex defends against,
what it explicitly does not, and why. It is the reference point for every
security-sensitive decision made later — if a proposed feature contradicts this
model, either the feature or this document must change, deliberately and visibly.

## 2. Design goal

> The server (Firebase project, its operators, and anyone who gains access to its
> data) must never be able to recover plaintext vault contents.

This is achieved through **client-side, zero-knowledge encryption**: all secret
content is encrypted on the device before it ever leaves it, using keys the
server never possesses.

## 3. Assets being protected

- Master password (never transmitted or stored)
- Vault Encryption Key and all derived/wrapped keys
- Item content: passwords, usernames, notes, API keys/tokens, recovery codes,
  identity data, card data, PINs, custom fields
- Attachments: images, PDFs, arbitrary files
- Metadata that could itself be sensitive: item titles, tags, website domains

## 4. Threats — in scope

| #   | Threat                                                       | Mitigation                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Compromised/leaked Firestore database                        | Item payloads (and titles/tags — see §2.5 of CRYPTOGRAPHIC_ARCHITECTURE.md) are AES-256-GCM ciphertext under keys never sent to the server. A DB dump yields ciphertext + non-sensitive sync metadata only.                                                        |
| 2   | Compromised/leaked Firebase Storage                          | Attachments are encrypted client-side before upload; Storage holds ciphertext blobs only.                                                                                                                                                                          |
| 3   | Malicious/compromised database administrator                 | Same as #1 — an admin with full DB access sees ciphertext, not secrets. No decrypt-capable admin tooling exists (§8).                                                                                                                                              |
| 4   | Accidental server-side logging of sensitive data             | Server code paths never receive plaintext vault content, so there is nothing sensitive to log server-side by construction. Client-side logging is restricted by `secureLogger` (see DEVELOPMENT.md) which redacts known-sensitive fields.                          |
| 5   | Intercepted network traffic                                  | TLS in transit (Firebase default) plus the payload itself is already ciphertext — defense in depth, not reliance on TLS alone.                                                                                                                                     |
| 6   | Stolen or lost device (locked)                               | Vault key is not persisted in plaintext; OS-level device lock + Kryvex auto-lock + (mobile) Keychain/Keystore-backed key protection mean a locked, powered-off device does not expose the vault.                                                                   |
| 7   | Stolen or lost device (unlocked)                             | Auto-lock timers minimize the exposure window. See §5 for the limit of this mitigation.                                                                                                                                                                            |
| 8   | Malicious browser extension on the web client                | Kryvex minimizes what's addressable in the DOM/clipboard, uses a restrictive CSP (§39 of build spec), and avoids putting decrypted secrets in places generically scriptable by other extensions longer than necessary. This is a partial mitigation only — see §5. |
| 9   | XSS in the web app                                           | Strict CSP, output encoding, no `dangerouslySetInnerHTML` with untrusted content, dependency review. Vault key never persisted to storage an XSS payload could exfiltrate at leisure (memory-only, short-lived).                                                   |
| 10  | CSRF                                                         | Firebase SDK calls are authenticated via bearer tokens, not ambient cookies, which structurally limits classic CSRF; Cloud Functions (if any accept HTTP) require verified ID tokens.                                                                              |
| 11  | Session/token theft                                          | Short-lived Firebase ID tokens, refresh token revocation on logout/"sign out of all devices", no vault key transmitted or derivable from the session token alone.                                                                                                  |
| 12  | Credential stuffing against Firebase Auth                    | Firebase Auth's built-in abuse protection, rate limiting, optional App Check, encourage strong unique master passwords (not reused as Firebase password necessarily — see RECOVERY.md / onboarding copy).                                                          |
| 13  | Brute force against the master password                      | Argon2id with tuned cost parameters makes offline guessing expensive; account lockout/backoff on Firebase Auth for online attempts.                                                                                                                                |
| 14  | Offline password/database cracking (attacker has ciphertext) | Argon2id KDF cost + AES-256-GCM; strength ultimately bounded by master password entropy — UX actively pushes users toward strong master passwords.                                                                                                                 |
| 15  | Clipboard leakage after copying a secret                     | Configurable auto-clear clipboard timer; clipboard contents never logged.                                                                                                                                                                                          |
| 16  | Screenshots / screen recording                               | Mobile: OS-level screenshot protection considered for vault/secret/reveal screens (§21 of build spec, platform differences documented at implementation time). Not a guarantee against a determined attacker with a second camera.                                 |
| 17  | Local cache inspection (browser DevTools, IndexedDB browser) | No plaintext vault content or raw vault key in IndexedDB/localStorage; cached items are ciphertext, decrypted only in memory on demand.                                                                                                                            |
| 18  | Mobile local storage inspection (rooted/jailbroken device)   | Keys stored via Keychain/Keystore; a fully compromised OS can still defeat this — see §5.                                                                                                                                                                          |
| 19  | Malicious third-party analytics/telemetry                    | Analytics conservative by default (opt-in), never receives secret values, titles, filenames, or URLs that could be sensitive (§37 of build spec).                                                                                                                  |
| 20  | Dependency compromise / supply-chain attack                  | Lockfiles committed, `pnpm audit`/Dependabot, extra scrutiny on crypto-adjacent dependencies, pinned versions for crypto libraries.                                                                                                                                |
| 21  | Corrupted synchronization data                               | All sync payloads are schema-validated (never trusted structurally) and AEAD-authenticated; corrupted/tampered ciphertext fails AEAD verification and is rejected before display.                                                                                  |
| 22  | Replay attacks on sync data                                  | Monotonic per-item revision numbers + timestamps; a replayed older ciphertext is detected as a stale/conflicting revision, not silently accepted (see SYNC_ENGINE.md).                                                                                             |
| 23  | Malicious or modified client                                 | The server enforces authorization (ownership) independent of client behavior; a modified client can only harm the attacker's own account, since it never had server-side trust to decrypt others' data or bypass Firestore/Storage rules.                          |
| 24  | Firebase security-rule misconfiguration                      | Rules are written defense-in-depth (explicit ownership checks, default-deny), covered by emulator-based automated tests (FIREBASE_SECURITY.md), reviewed on every change.                                                                                          |

## 5. Threats — explicitly out of scope / cannot be fully mitigated

Kryvex does not claim to be "unhackable." The following are structural limits of
client-side encryption, stated plainly rather than glossed over:

- **Fully compromised device while the vault is unlocked.** If an attacker has
  arbitrary code execution on a device at the moment the user has unlocked the
  vault (malware, a malicious OS, a compromised browser process with debugger
  access), they can read decrypted secrets from memory the same way the
  legitimate app does. No client-side encryption scheme can prevent this.
- **Keyloggers / OS-level input capture.** A compromised OS capturing the master
  password as it's typed defeats the scheme regardless of what Kryvex does
  afterward.
- **A user who chooses a weak, guessable master password.** Argon2id raises the
  cost of guessing but cannot turn a weak password into a strong one.
- **Loss of both the master password and the recovery key/kit.** By design (see
  RECOVERY.md), Kryvex cannot recover the vault in this case. This is a
  deliberate trade-off in favor of not weakening zero-knowledge guarantees with a
  server-side recovery backdoor.
- **Physical coercion of the user.** Out of scope for a software threat model.
- **Compromise of the underlying OS/hardware root of trust** (e.g., a broken
  Secure Enclave/TEE, a rooted device with kernel-level malware). Kryvex trusts
  the platform's Keychain/Keystore/Web Crypto implementations to behave as
  documented.
- **Side-channel attacks against the cryptographic libraries themselves**
  (timing attacks, etc.) — mitigated only to the extent the underlying,
  independently-audited libraries mitigate them. Kryvex does not implement its
  own primitives and cannot independently audit third-party library
  side-channel resistance.

Kryvex will never market itself as "military-grade," "unhackable," "unbreakable,"
or similar. Marketing/UI copy is reviewed against this document.

## 6. Non-goals

- Kryvex is not an enterprise IAM/SSO product (no v1 team/shared vaults — see
  roadmap in KRYVEX_SOURCE_OF_TRUTH.md).
- Kryvex does not attempt to detect or prevent device-level malware.
- Kryvex does not implement its own transport security (relies on TLS + platform
  networking stacks).

## 7. Explicit non-negotiables (see build spec §69)

Never: log passwords/master password/decrypted objects; put secrets in URLs or
analytics; use `Math.random()` for security-sensitive randomness; invent
cryptographic algorithms; use weak password hashing (MD5, SHA-1, plain SHA-256);
hard-code keys; commit secrets to git; store plaintext secrets in `localStorage`;
build an admin endpoint that can decrypt user vaults; treat Firebase
Authentication as equivalent to vault decryption; trust frontend-only
authorization; silently overwrite sync conflicts.
