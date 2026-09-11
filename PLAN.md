# Kryvex — Build Plan

Status: **Phase 4 (Vault) complete for web.** Phases 0-3 are done. Phase 4
implemented real vault item CRUD for `apps/web`: all 11 `ItemType`s, custom
fields, a real CSPRNG password generator, favorites, tags, and in-memory
substring search — direct Firestore reads/writes, without Phase 5's
offline/conflict machinery. See "Current status" in
`KRYVEX_SOURCE_OF_TRUTH.md` for full detail, the new decisions log rows, and
open follow-ups (a manual browser click-through and the CLAUDE.md §4 step 6
security review are flagged, not yet done). Phase 4b (porting these screens
to `apps/mobile`) is next, followed by Phase 5 (Sync).
Owner: lead architect/engineer (Claude), directed by project owner
Last updated: 2026-09-11

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

| Phase | Focus                                                                                                                                                                                                                                                                                                           |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | **Done.** Foundation — monorepo, web+mobile scaffolds, shared packages, lint/test/CI, Firebase emulator                                                                                                                                                                                                         |
| 2     | **Done.** Authentication — Firebase Auth, registration/login/logout, `AUTHENTICATED_LOCKED` state (also pulled in Argon2id/HKDF, originally planned for Phase 3)                                                                                                                                                |
| 3     | **Done.** Cryptographic core — encrypt/decrypt (AES-256-GCM via `@noble/ciphers`), envelope serialization, tamper detection (fail-closed AEAD unwrap), Vault Encryption Key generation/wrapping. KDF/HKDF already landed in Phase 2. Shipped without new tests per explicit direction — flagged as a follow-up. |
| 4     | **Done (web).** Vault — all 11 item types, custom fields, generator, favorites, tags, search. Phase 4b (the same screens on `apps/mobile`) is scheduled as the immediate next step, not folded into Phase 5.                                                                                                    |
| 5     | Sync — encrypted Firestore records, offline, versioning, conflicts, tombstones                                                                                                                                                                                                                                  |
| 6     | Attachments — encrypted image/PDF/file, Storage, secure previews                                                                                                                                                                                                                                                |
| 7     | Mobile security — biometric unlock, secure storage, auto-lock, clipboard, screenshot strategy                                                                                                                                                                                                                   |
| 8     | UX polish — responsive UI, accessibility, onboarding, empty/error/loading states                                                                                                                                                                                                                                |
| 9     | Security hardening — dedicated review pass across XSS/CSRF/rules/crypto/logging/deps                                                                                                                                                                                                                            |
| 10    | Release — production Firebase, web deploy, Android/iOS builds, release checklist                                                                                                                                                                                                                                |

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
   in `KRYVEX_SOURCE_OF_TRUTH.md` for the two flagged follow-ups (manual
   browser click-through, CLAUDE.md §4 step 6 security review).
8. **Next up:** Phase 4b — port the Phase 4 screens to `apps/mobile` via
   Expo Router, reusing the platform-agnostic packages built this phase;
   then Phase 5 (Sync).
