# Kryvex — Source of Truth

Status: **Phase 3 (Cryptographic Core) complete.** This is the primary project
reference. Read this before any other file when picking up work on Kryvex.
Detailed reasoning for each section lives in the linked `docs/*.md` file —
this document summarizes and cross-references rather than duplicating.

---

## 1. Product overview

Kryvex is a security-first, zero-knowledge encrypted personal vault for
passwords, credentials, secrets, notes, identity/card data, recovery codes,
API keys, images, PDFs, and files, syncing across web and mobile.

**Core constraint:** the server must never need access to plaintext vault
contents. Every architectural decision is filtered through this first.

**Core experience:** Unlock → Find → Reveal/Copy/Use. Nothing else is allowed
to complicate that loop (see build-spec §75 for the full product philosophy —
the master prompt this project was scoped from).

## 2. Architecture

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the system diagram,
client lock state machine, end-to-end data flow, and monorepo rationale.

## 3. Folder structure

```
kryvex/
├── apps/{web,mobile}
├── packages/{crypto,vault,sync,firebase,types,validation,password-generator,storage,security,ui}
├── firebase/{firestore.rules,storage.rules,functions}
├── docs/
├── tests/
├── PLAN.md
├── KRYVEX_SOURCE_OF_TRUTH.md
└── CLAUDE.md
```

Full rationale: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) §4.

## 4. Screens

Vault Home, Item Detail, Add/Edit Item, Password Generator, Settings,
Onboarding (master password creation, recovery kit, biometric opt-in). IA
diagram: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) §5.

## 5. Data model

Envelope/`ItemContent` split, all 11 item types (Login, Secure Note, Identity,
Card, PIN, API Key, Recovery Codes, Image, PDF, File, Custom), attachment
model, field-level encryption rationale table:
[docs/DATA_MODEL.md](./docs/DATA_MODEL.md).

## 6. Encryption model

AES-256-GCM (content), Argon2id (password KDF), HKDF-SHA-256 (key
stretching/domain separation), versioned envelope serialization, fail-closed
tamper handling: [docs/CRYPTOGRAPHIC_ARCHITECTURE.md](./docs/CRYPTOGRAPHIC_ARCHITECTURE.md) §1–3.

## 7. Key hierarchy

```
Master Password → Argon2id → Master Key → HKDF → Stretched Master Key
   → wraps Protected Vault Encryption Key (stored server-side)
   → unwraps to Vault Encryption Key
   → wraps per-item / per-attachment Data Encryption Keys
   → (separately) wraps under a user-held Recovery Key for backup
```

Full diagram and per-operation detail:
[docs/CRYPTOGRAPHIC_ARCHITECTURE.md](./docs/CRYPTOGRAPHIC_ARCHITECTURE.md) §2.
Recovery flow detail: [docs/RECOVERY.md](./docs/RECOVERY.md).

## 8. Firebase architecture

Firestore layout `users/{uid}/{items,attachments}` + profile doc; ownership-
enforced security rules with compare-and-swap revision checks; Storage holds
ciphertext blobs only; Cloud Functions limited to account deletion and
tombstone GC, never decryption: [docs/FIREBASE_SECURITY.md](./docs/FIREBASE_SECURITY.md).

## 9. Sync architecture

Client-generated UUIDs, monotonic per-document revisions, tombstone deletes,
user-facing conflict resolution (never silent overwrite), lazy attachment
blob sync: [docs/SYNC_ENGINE.md](./docs/SYNC_ENGINE.md).

## 10. Authentication

Firebase Authentication for identity only; structurally separate from vault
decryption (`AUTHENTICATED_LOCKED` is a valid, expected state). Implemented
(Phase 2): email/password sign-up/sign-in/sign-out, the prelogin flow
(`getKdfParams`), and the `packages/vault` lock state machine
(`SIGNED_OUT → AUTHENTICATED_LOCKED → UNLOCKING → UNLOCKED → LOCKING`) wired
through each app's own `VaultProvider`. Detail:
[docs/CRYPTOGRAPHIC_ARCHITECTURE.md](./docs/CRYPTOGRAPHIC_ARCHITECTURE.md) §4,
§4.1, [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) §2.

## 11. Device unlock

Biometric unlock (Face ID / Touch ID / Android Biometric Prompt) gates access
to a locally Keychain/Keystore-protected key, never to the master password or
raw biometric data: [docs/CRYPTOGRAPHIC_ARCHITECTURE.md](./docs/CRYPTOGRAPHIC_ARCHITECTURE.md) §7,
build spec §18.

## 12. Security decisions log

| Decision                                                                                                                                              | Rationale                                                                                                                                                                                                | Reference                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Envelope encryption (per-item/attachment DEKs, not direct Vault-Key encryption)                                                                       | Cheap key rotation; future sharing without re-encrypting content                                                                                                                                         | CRYPTOGRAPHIC_ARCHITECTURE.md §2          |
| Titles/tags encrypted, not left plaintext                                                                                                             | Metadata itself can be sensitive                                                                                                                                                                         | CRYPTOGRAPHIC_ARCHITECTURE.md §5          |
| `favorite` flag left plaintext                                                                                                                        | Low-sensitivity sorting convenience; explicitly flagged exception                                                                                                                                        | DATA_MODEL.md §5                          |
| Attachment `mimeType`/`sizeBytes` left plaintext                                                                                                      | Needed for non-decrypting UI/quota; low sensitivity                                                                                                                                                      | DATA_MODEL.md §5                          |
| Hard deletes disallowed client-side; tombstones only                                                                                                  | Enables correct offline conflict/delete semantics                                                                                                                                                        | SYNC_ENGINE.md §5                         |
| Recovery via user-held Recovery Key, no server escrow                                                                                                 | Preserves zero-knowledge guarantee; explicit unrecoverable-if-lost tradeoff                                                                                                                              | RECOVERY.md §1                            |
| Firebase Auth value ≠ master password (HKDF-derived)                                                                                                  | Compromised Firebase credential must not reveal master password                                                                                                                                          | CRYPTOGRAPHIC_ARCHITECTURE.md §4          |
| Prelogin via a narrow unauthenticated Cloud Function (`getKdfParams`), not a deterministic/email-derived salt or a public Firestore lookup collection | Deterministic salt lets an attacker precompute it fully offline; a public collection needs a second copy of the salt kept in sync on every param rotation                                                | CRYPTOGRAPHIC_ARCHITECTURE.md §4.1        |
| Argon2id/HKDF pulled into Phase 2 (not deferred to Phase 3 as originally planned)                                                                     | The Firebase Auth credential is itself HKDF-derived from the master password — Phase 2 auth can't be correct without it; Phase 3 now covers only AES-256-GCM item/attachment encryption and key wrapping | PLAN.md, CRYPTOGRAPHIC_ARCHITECTURE.md §4 |
| Pure-JS Argon2id (`@noble/hashes`) on mobile, not WASM/native                                                                                         | Plain Expo Go (no `expo prebuild`) can't run WASM in Hermes or link native modules; revisit once native tooling lands (Phase 7/10)                                                                       | DEVELOPMENT.md                            |
| Pure-JS AES-256-GCM (`@noble/ciphers`) for Phase 3, not WASM/native                                                                                   | Same plain-Expo-Go constraint as Argon2id above; same profile/dependency family as `@noble/hashes`, already proven                                                                                       | DEVELOPMENT.md                            |
| Hand-rolled `btoa`/`atob` base64 wrapper in `packages/crypto`, not a new dependency                                                                   | Neither `@noble/hashes` nor `@noble/ciphers` exports base64; native Hermes/browser `btoa`/`atob` support confirmed for this repo's Expo SDK (57, past the SDK-51 baseline)                               | CRYPTOGRAPHIC_ARCHITECTURE.md §3          |
| `unlock()`'s Phase 2 `signInWithAuthSecret` re-verification call dropped, replaced with local AEAD unwrap                                             | Phase 3's `protectedVaultKey` unwrap-and-fail-closed is now the real local correctness signal Phase 2 lacked; re-authenticating an already-signed-in user on every unlock was redundant once it existed  | CRYPTOGRAPHIC_ARCHITECTURE.md §11         |

## 13. Known limitations

Kryvex cannot protect against: a fully compromised device while unlocked,
OS-level keyloggers, a weak user-chosen master password, loss of both master
password and recovery kit, physical coercion, or compromise of the platform's
own secure-storage hardware/TEE. Full list:
[docs/SECURITY_THREAT_MODEL.md](./docs/SECURITY_THREAT_MODEL.md) §5.
No marketing or UI copy may claim "unhackable"/"military-grade"/similar.

## 14. Development commands

Real and verified: `pnpm install/dev/build/lint/typecheck/test`,
`pnpm test:security` (Firestore/Storage rules against the real emulator), and
`pnpm test:auth` (Firebase Auth + prelogin flow against the real emulator) —
all via `firebase emulators:exec`. Full command surface, confirmed tooling
versions, and TypeScript-6.0.3-under-pnpm workarounds:
[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## 15. Deployment process

Firebase emulator → staging → production; rules/functions only deployed after
emulator-based security tests pass; EAS Build for iOS/Android; release
checklist: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md).

## 16. Testing strategy

Unit tests mandatory for crypto/validation/sync/password-generator packages
before those packages are "done"; Firestore/Storage rule tests against the
emulator in CI on every rules change; security review required (not
optional) before merging anything touching encryption, auth, authorization,
storage, sync, key management, or attachments: build spec §41–§43,
[docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) §7.

## 17. Future roadmap

- **V1** (current target): auth, encrypted vault, all 11 item types, password
  generator, search, tags, favorites, attachments, Firebase sync, offline
  support, biometric unlock, auto-lock, clipboard protection.
- **V1.5**: TOTP generation, improved recovery options, encrypted
  export/import, improved search, device management UI.
- **V2**: Android Autofill, iOS Credential Provider, browser extension
  (architecture pre-designed in [docs/AUTOFILL_ARCHITECTURE.md](./docs/AUTOFILL_ARCHITECTURE.md)),
  passkeys, secure sharing, emergency access, team/family vaults.

---

## Current status

Phase 0 (Architecture) documents are complete:
`docs/SECURITY_THREAT_MODEL.md`, `docs/CRYPTOGRAPHIC_ARCHITECTURE.md`,
`docs/DATA_MODEL.md`, `docs/FIREBASE_SECURITY.md`, `docs/SYNC_ENGINE.md`,
`docs/AUTOFILL_ARCHITECTURE.md`, `docs/ARCHITECTURE.md`,
`docs/DEVELOPMENT.md`, `docs/DEPLOYMENT.md`, `docs/RECOVERY.md`, this file,
and `CLAUDE.md`.

Phase 1 (Foundation) is complete: a pnpm/Turborepo monorepo exists with
`apps/web` (Next.js 16, placeholder page rendering `@kryvex/ui`), `apps/mobile`
(Expo SDK 57, placeholder screen), all 10 `packages/*` scaffolded (each with a
placeholder export + passing test — no real crypto/vault/sync/etc. logic
yet, per phase boundaries), `firebase/firestore.rules` and
`firebase/storage.rules` transcribed from `docs/FIREBASE_SECURITY.md` as real
deployable rules, a `firebase/functions` scaffold with one trivial health-check
function, a `tests/security` Firestore-rules test suite (9 passing tests
against the real emulator), and a GitHub Actions CI workflow. **No feature
code exists yet** — key derivation, encryption, auth, and vault CRUD are
Phases 2-4.

Phase 2 (Authentication) is complete: `packages/crypto` has real Argon2id/
HKDF (`@noble/hashes`, pure JS — no WASM/native module, so it runs on plain
Expo Go); `packages/firebase` has real `initializeApp`/Auth/Firestore/
Functions wiring (web and React-Native-persistence variants) plus thin
sign-up/sign-in/sign-out/profile-doc/prelogin wrappers; `packages/vault` has
the real lock state machine (reducer, table-tested); `firebase/functions`
adds the `getKdfParams` prelogin Cloud Function; both apps have real
Sign Up / Sign In / Unlock screens and a gated home screen wired through a
`VaultProvider`; a new `tests/auth` workspace exercises the real flow against
the Auth/Firestore/Functions emulators. See §12's decisions log for the two
scope changes made along the way (pulling KDF into Phase 2; the prelogin
mechanism) and `docs/DEVELOPMENT.md` §3 for new TypeScript/ESLint/Metro/RN
ecosystem workarounds.

Phase 3 (Cryptographic Core) is complete: `packages/crypto` adds real
AES-256-GCM content encryption and key wrapping (`@noble/ciphers`, same
pure-JS/no-WASM/no-native-module profile as Argon2id) via
`generateKey`/`encryptBytes`/`decryptBytes` in the new `aead.ts`; `signUp` on
both apps now generates a random Vault Encryption Key and wraps it under the
Stretched Master Key as `protectedVaultKey` on the profile document; `signIn`
fetches and unwraps it after authentication (via the `pendingUnlock`/
`resolveVaultKey` mechanism in `VaultProvider`, unifying signup's
already-in-hand key with signin's fetch-then-unwrap); `unlock()`'s Phase 2
stand-in (re-authenticating against Firebase as the only correctness check)
is replaced with the real local AEAD unwrap-and-fail-closed check, so a wrong
master password now fails locally via a GCM tag mismatch, not just via a
Firebase rejection; `packages/vault`'s lock state machine carries the
unwrapped Vault Encryption Key in its `UNLOCKED` state. See §12's decisions
log for the new rows and `docs/DEVELOPMENT.md`'s new "Phase 3 additions and
gotchas" section for implementation-level detail.

**Per explicit direction, this phase's code shipped without new automated
tests** — flagged deliberately, not silently dropped. The only test-file
edits were fixture updates to keep the _existing_ suite (16
`lockStateMachine` assertions, the web/mobile home-screen tests) compiling
against the extended `UNLOCKED`/`UNLOCK_SUCCEEDED` shape. A manual,
line-by-line security self-review of `aead.ts` against
`docs/CRYPTOGRAPHIC_ARCHITECTURE.md` §3/§11 (nonce freshness, fail-closed
tamper handling on every error path, no partial-plaintext return, no
internals-leaking error messages) was performed as the substitute check
required by `CLAUDE.md` §4 step 6. Recommended first follow-up before Phase
4 builds further on these primitives: add real coverage for `aead.ts`
(round-trip, tamper/tag-mismatch, wrong-length-nonce, unknown-version
rejection) and the `VaultProvider` VEK wiring.

Verified: `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`,
`pnpm build`, `pnpm test:security`, and `pnpm test:auth` all pass against the
Phase 3 changes — the last of these is a regression check confirming
`signUp` writing the new `protectedVaultKey` field doesn't break the
existing sign-up/sign-in/prelogin emulator flow (it doesn't assert anything
about the VEK itself, consistent with this phase's no-new-tests scope).
**Not yet done, flagged rather than assumed (carried over from Phase 2, plus
new for Phase 3):** an actual click-through of the web UI in a browser and
running `apps/mobile` in a real Expo Go session to confirm the crypto paths
genuinely work under Hermes — no browser-automation tool was available this
session either time. Recommended before considering Phase 3 fully signed
off, not optional polish, especially the incorrect-password unlock path
this phase newly makes local.

Git: the working tree has a real local repository with a GitHub remote
(`origin` → `deepsingh245/Kryvex`) the user manages themselves — this session
commits locally with plain, non-AI-attributed commit messages and never runs
`git push` (see `CLAUDE.md`).

Phase 3 (Cryptographic core — AES-256-GCM item/attachment encryption, key
wrapping, tamper detection; the KDF/HKDF half already landed in Phase 2) is
next.
