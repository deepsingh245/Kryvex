# Kryvex — Build Plan

Status: **Phase 8w (UX polish, web) complete.**
`apps/web` is being taken to full completion before any `apps/mobile` work
resumes (this session's strategy change — see §4's Track A/Track B split).
Phase 8w closed the concrete gaps found in a codebase audit: a real settings
screen (`/settings`) that reads/writes `UserProfileSettings`
(`autoLockMinutes`/`clipboardClearSeconds`/`biometricUnlockEnabled`) instead
of those being hardcoded, with `clipboardClearSeconds` threaded all the way
to every Copy button; accessibility fixes (label/input association,
`aria-pressed`, an `aria-live` copy announcement, new `aria-label`s);
error-surfacing for the previously-silent Firestore-listener and
conflict-resolution failure paths; responsive-layout fixes to the four
densest rows found; and `autoFocus` on every auth-flow page's first field.
See "Current status" in `KRYVEX_SOURCE_OF_TRUTH.md` for full detail and the
decisions log. **Next up:** Phase 9w (security hardening).
Owner: lead architect/engineer (Claude), directed by project owner
Last updated: 2026-09-13

This document is the working plan for building Kryvex, a zero-knowledge encrypted
personal vault. It sequences the work into checkpoints so that no security-sensitive
decision gets made implicitly inside a code diff. It will be kept up to date as
decisions are finalized; once the codebase exists, `KRYVEX_SOURCE_OF_TRUTH.md` becomes
the canonical reference and this file tracks remaining/in-flight work.

---

## 1. Guiding constraint

> The server must never need access to plaintext vault contents.

Every decision below is filtered through that constraint first, usability second.

---

## 2. Locked-in architecture decisions (subject to Phase 0 review before coding)

These are the defaults this build will use unless a doc in Phase 0 documents a reason
to deviate. Nothing here is implemented yet — writing it down first so it can be
challenged before it's load-bearing.

### 2.1 Cryptography

- **Password KDF:** Argon2id (mature WASM/native binding per platform), tuned to a
  target unlock time (~500ms–1s on typical hardware), with per-user random salt
  stored alongside the (non-secret) account record.
- **Symmetric encryption:** AES-256-GCM for all item payloads and attachments, with a
  fresh random 96-bit nonce per encryption operation and the auth tag verified before
  any plaintext is accepted.
- **No custom crypto, no reversible "encoding" masquerading as encryption, no static
  or hard-coded keys.**

### 2.2 Key hierarchy (envelope encryption, Bitwarden-style)

```
Master Password
      │  Argon2id (per-user salt)
      ▼
Master Key  ──HKDF──▶  Stretched Master Key
      │
      │  wraps (AES-256-GCM)
      ▼
Vault Encryption Key (random 256-bit, generated once at signup)
      │
      ├─ wraps ─▶ per-item Data Encryption Keys (envelope per record; enables
      │           future rotation/sharing without re-encrypting the whole vault)
      └─ wraps ─▶ per-attachment Data Encryption Keys
```

- A separate **Recovery Key** (random 256-bit, shown once as a recovery kit) also
  wraps the Vault Encryption Key, so losing the master password is recoverable only
  if the user saved the recovery kit — otherwise the vault is explicitly
  unrecoverable. No silent weakening of this for convenience.
- Firebase Authentication identifies the account; it is never in the decryption
  path. `AUTHENTICATED_LOCKED` is a valid, expected state.

### 2.3 Firebase usage

- **Auth:** email/password + optional OAuth providers for identity only.
- **Firestore:** encrypted item blobs + minimal sync metadata (id, version,
  updatedAt, tombstone flag). No plaintext fields beyond what's structurally
  required for sync (never titles/usernames/secrets in the clear).
- **Storage:** encrypted attachment blobs only, uploaded post-client-side-encryption.
- **Cloud Functions:** kept minimal — account lifecycle/cleanup only, never a
  decryption path.
- **Security rules:** ownership-enforced (`request.auth.uid == resource.data.ownerId`),
  tested with the emulator, never relying on client-side checks alone.

### 2.4 Sync model

- Per-record monotonic revision number + `updatedAt` + tombstone-based deletes.
- Compare-and-swap on write; concurrent edits are surfaced as conflicts (both
  versions retained for user resolution) rather than silently overwritten.

### 2.5 Local/offline storage

- Decrypted Vault Encryption Key lives in memory only, cleared on lock/background/
  timeout; never written to `localStorage`.
- Encrypted cache may live in IndexedDB (web) / secure app storage (mobile) for
  offline-first use.
- Mobile key material protected via Keychain (iOS) / Keystore (Android); biometric
  unlock gates access to that protected material, never to raw biometric data.

### 2.6 Monorepo layout

```
kryvex/
├── apps/{web,mobile}
├── packages/{crypto,vault,sync,firebase,types,validation,password-generator,storage,security,ui}
├── firebase/{firestore.rules,storage.rules,functions}
├── docs/
├── tests/
```

pnpm workspaces + Turborepo; Next.js + TypeScript for web; Expo/React Native +
TypeScript for mobile; strict TS everywhere; Zod (or equivalent) for all boundary
validation (Firebase data, decrypted payloads, sync payloads are never trusted
structurally).

---

## 3. Phase 0 deliverables (current phase — docs only, no app code)

Checklist of documents to produce before any implementation begins:

- [x] `docs/SECURITY_THREAT_MODEL.md` — threats in/out of scope, explicit non-goals
- [x] `docs/CRYPTOGRAPHIC_ARCHITECTURE.md` — full key hierarchy, algorithms, rotation,
      recovery, lock/logout/account-deletion implications
- [x] `docs/DATA_MODEL.md` — item types, custom fields, attachment model
- [x] `docs/FIREBASE_SECURITY.md` — Firestore/Storage rules, App Check, test cases
- [x] `docs/SYNC_ENGINE.md` — IDs, versions, tombstones, conflict resolution
- [x] `docs/AUTOFILL_ARCHITECTURE.md` — future Android/iOS/browser-extension design
- [x] `docs/ARCHITECTURE.md` — system overview tying the above together
- [x] `docs/DEVELOPMENT.md`, `docs/DEPLOYMENT.md`, `docs/RECOVERY.md`
- [x] `KRYVEX_SOURCE_OF_TRUTH.md` — primary project reference (all sections per
      master prompt §65)
- [x] `CLAUDE.md` — rules for future sessions (read source-of-truth first, don't
      rescan repo, preserve architecture, never expose secrets, etc.)

**Checkpoint:** after these exist, present an `ARCHITECTURE READY` summary
(structure / security model / crypto model / Firebase model / web / mobile /
screens / phases / risks) for explicit sign-off before Phase 1 begins.

---

## 4. Phase roadmap (post-architecture)

**Strategy (this session):** `apps/web` is taken to full completion first —
every phase below through release. `apps/mobile` is then brought up to the
same point as one consolidated pass, rather than interleaving a "Xb" mobile
port after every web phase as before. Phases already done on both platforms
(4, 5) are unaffected; it's only the _not-yet-started_ work that's reordered.

### Track A — Web completion (current focus, uninterrupted)

| Phase | Focus                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **Done.** Foundation — monorepo, web+mobile scaffolds, shared packages, lint/test/CI, Firebase emulator                                                                                                                                                                                                                                                                                                                                                             |
| 2     | **Done.** Authentication — Firebase Auth, registration/login/logout, `AUTHENTICATED_LOCKED` state (also pulled in Argon2id/HKDF, originally planned for Phase 3)                                                                                                                                                                                                                                                                                                    |
| 3     | **Done.** Cryptographic core — encrypt/decrypt (AES-256-GCM via `@noble/ciphers`), envelope serialization, tamper detection (fail-closed AEAD unwrap), Vault Encryption Key generation/wrapping. KDF/HKDF already landed in Phase 2. Shipped without new tests per explicit direction — flagged as a follow-up.                                                                                                                                                     |
| 4     | **Done (web + mobile).** Vault — all 11 item types, custom fields, generator, favorites, tags, search, on both `apps/web` and `apps/mobile`.                                                                                                                                                                                                                                                                                                                        |
| 5     | **Done (web + mobile).** Sync — encrypted Firestore records, offline, versioning, conflicts, tombstones, on both platforms.                                                                                                                                                                                                                                                                                                                                         |
| 6     | **Done (web).** Attachments — encrypted image/PDF/file, Storage, secure previews.                                                                                                                                                                                                                                                                                                                                                                                   |
| 7w    | **Done.** Web session security + Recovery Key — real `packages/security/autoLock.ts`/`clipboard.ts` implementations wired into `apps/web` (a "Lock" button, idle-timeout/tab-hidden auto-lock, clipboard-clear-after-timeout), plus the full Recovery Key/Emergency Kit flow (`docs/RECOVERY.md`) so a forgotten master password is actually recoverable. Biometric/Keychain-Keystore concerns stay mobile-only (Phase 7m below) — nothing analogous exists on web. |
| 8w    | **Done.** UX polish (web) — settings screen (`/settings`) for `autoLockMinutes`/`clipboardClearSeconds`/`biometricUnlockEnabled`, accessibility fixes, error/loading-state gaps closed, responsive layout, focus management.                                                                                                                                                                                                                                        |
| 9w    | **Next.** Security hardening (web + shared packages) — dedicated review pass across XSS/CSRF/rules/crypto/logging/deps                                                                                                                                                                                                                                                                                                                                              |
| 10w   | Release (web) — production Firebase project, web deploy, release checklist                                                                                                                                                                                                                                                                                                                                                                                          |

### Track B — Mobile completion (deferred until Track A is entirely done)

| Phase | Focus                                                                                                                                                                                                                               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6b    | Attachments (mobile port) — native file/image picker (`expo-image-picker`, `expo-document-picker`), `expo-sharing` for the system-viewer hand-off                                                                                   |
| 7m    | Mobile security — biometric unlock (Face ID/Touch ID/Android Biometric Prompt), Keychain/Keystore-backed secure key storage, auto-lock/clipboard reusing Track A's `packages/security` work, screenshot/screen-recording protection |
| 8m    | UX polish (mobile)                                                                                                                                                                                                                  |
| 9m    | Security hardening (mobile-specific — native module review, on top of Track A's shared-package hardening)                                                                                                                           |
| 10m   | Release (mobile) — EAS builds, App Store/Play Store submission                                                                                                                                                                      |

Each phase ends with: tests run, security implications reviewed, docs updated,
and a short "Changed / Tests / Security considerations / Files / Next step" report.

---

## 5. Open risks / decisions to confirm during Phase 0

- Exact Argon2id parameter targets per platform (mobile CPU/battery budget vs. web).
- Whether tags/titles need client-side encryption too (metadata leakage) — current
  lean: yes, encrypt titles/tags, keep only IDs/timestamps/versions in the clear.
- Recovery UX: printable kit vs. downloadable file vs. both.
- ~~Local search index approach for large vaults without server-side plaintext.~~
  Resolved Phase 4: in-memory substring scan over already-decrypted content,
  no persisted index (see DATA_MODEL.md §6) — revisit once Phase 5's offline
  cache exists to host a real index, if usage at scale shows it's needed.
- Screenshot/screen-recording protection scope on mobile (which screens, which OS
  differences).

---

## 6. Immediate next steps

1. ~~Confirm dev tooling available in this environment (Node/pnpm/Expo/Firebase CLI).~~ Done.
2. ~~Write the Phase 0 documents listed in §3.~~ Done.
3. ~~Present the `ARCHITECTURE READY` checkpoint for sign-off.~~ Done.
4. ~~Begin Phase 1 scaffolding.~~ Done — see "Current status" in
   `KRYVEX_SOURCE_OF_TRUTH.md`.
5. ~~Phase 2 (Authentication).~~ Done.
6. ~~Phase 3 (Cryptographic core).~~ Done.
7. ~~Phase 4 (Vault item CRUD) for `apps/web`.~~ Done — see "Current status"
   in `KRYVEX_SOURCE_OF_TRUTH.md`.
8. ~~Phase 4b (port Phase 4 to `apps/mobile`).~~ Done — see "Current status"
   in `KRYVEX_SOURCE_OF_TRUTH.md` for the one flagged follow-up per platform
   (a manual browser/Expo Go click-through — no automation tool available
   either session).
9. ~~Phase 5 (Sync) for `apps/web`.~~ Done — see "Current status" in
   `KRYVEX_SOURCE_OF_TRUTH.md` for the two scope decisions made against
   `docs/SYNC_ENGINE.md` and the flagged manual-click-through follow-up.
10. ~~Phase 5b (port the sync engine to `apps/mobile`).~~ Done — see
    "Current status" in `KRYVEX_SOURCE_OF_TRUTH.md` for the hydrate/listener
    race-condition fix made to both platforms' hooks and the flagged
    manual-click-through follow-up.
11. ~~Phase 6 (Attachments) for `apps/web`.~~ Done — see "Current status" in
    `KRYVEX_SOURCE_OF_TRUTH.md` for the full decisions log (scope,
    encryption, preview-depth, and rules/GC choices) and the flagged
    manual-click-through follow-up.
12. ~~Phase 6b — port attachments to `apps/mobile`.~~ **Deferred** (this
    session's strategy change): `apps/mobile` work of any kind, including
    already-scoped Phase 6b, is paused until Track A (web) reaches Phase
    10w. See §4's Track A/Track B split.
13. ~~Phase 7w — web session security + Recovery Key.~~ Done — see
    "Current status" in `KRYVEX_SOURCE_OF_TRUTH.md` for the full decisions
    log (two-factor recovery, no-QR scope trim, hardcoded-defaults trim)
    and the flagged manual-click-through follow-up.
14. ~~Phase 8w — UX polish (web).~~ Done — see "Current status" in
    `KRYVEX_SOURCE_OF_TRUTH.md` for the full decisions log (settings screen,
    accessibility, error-surfacing, responsive layout, focus management).
15. **Next up:** Phase 9w — security hardening (web + shared packages):
    dedicated review pass across XSS/CSRF/rules/crypto/logging/deps.
