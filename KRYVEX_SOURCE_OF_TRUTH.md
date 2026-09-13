# Kryvex — Source of Truth

Status: **Phase 6 (Attachments) complete for web.** This is the primary project
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

| Decision                                                                                                                                                                                                   | Rationale                                                                                                                                                                                                                                                                                                                   | Reference                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Envelope encryption (per-item/attachment DEKs, not direct Vault-Key encryption)                                                                                                                            | Cheap key rotation; future sharing without re-encrypting content                                                                                                                                                                                                                                                            | CRYPTOGRAPHIC_ARCHITECTURE.md §2                                            |
| Titles/tags encrypted, not left plaintext                                                                                                                                                                  | Metadata itself can be sensitive                                                                                                                                                                                                                                                                                            | CRYPTOGRAPHIC_ARCHITECTURE.md §5                                            |
| `favorite` flag left plaintext                                                                                                                                                                             | Low-sensitivity sorting convenience; explicitly flagged exception                                                                                                                                                                                                                                                           | DATA_MODEL.md §5                                                            |
| Attachment `mimeType`/`sizeBytes` left plaintext                                                                                                                                                           | Needed for non-decrypting UI/quota; low sensitivity                                                                                                                                                                                                                                                                         | DATA_MODEL.md §5                                                            |
| Hard deletes disallowed client-side; tombstones only                                                                                                                                                       | Enables correct offline conflict/delete semantics                                                                                                                                                                                                                                                                           | SYNC_ENGINE.md §5                                                           |
| Recovery via user-held Recovery Key, no server escrow                                                                                                                                                      | Preserves zero-knowledge guarantee; explicit unrecoverable-if-lost tradeoff                                                                                                                                                                                                                                                 | RECOVERY.md §1                                                              |
| Firebase Auth value ≠ master password (HKDF-derived)                                                                                                                                                       | Compromised Firebase credential must not reveal master password                                                                                                                                                                                                                                                             | CRYPTOGRAPHIC_ARCHITECTURE.md §4                                            |
| Prelogin via a narrow unauthenticated Cloud Function (`getKdfParams`), not a deterministic/email-derived salt or a public Firestore lookup collection                                                      | Deterministic salt lets an attacker precompute it fully offline; a public collection needs a second copy of the salt kept in sync on every param rotation                                                                                                                                                                   | CRYPTOGRAPHIC_ARCHITECTURE.md §4.1                                          |
| Argon2id/HKDF pulled into Phase 2 (not deferred to Phase 3 as originally planned)                                                                                                                          | The Firebase Auth credential is itself HKDF-derived from the master password — Phase 2 auth can't be correct without it; Phase 3 now covers only AES-256-GCM item/attachment encryption and key wrapping                                                                                                                    | PLAN.md, CRYPTOGRAPHIC_ARCHITECTURE.md §4                                   |
| Pure-JS Argon2id (`@noble/hashes`) on mobile, not WASM/native                                                                                                                                              | Plain Expo Go (no `expo prebuild`) can't run WASM in Hermes or link native modules; revisit once native tooling lands (Phase 7/10)                                                                                                                                                                                          | DEVELOPMENT.md                                                              |
| Pure-JS AES-256-GCM (`@noble/ciphers`) for Phase 3, not WASM/native                                                                                                                                        | Same plain-Expo-Go constraint as Argon2id above; same profile/dependency family as `@noble/hashes`, already proven                                                                                                                                                                                                          | DEVELOPMENT.md                                                              |
| Hand-rolled `btoa`/`atob` base64 wrapper in `packages/crypto`, not a new dependency                                                                                                                        | Neither `@noble/hashes` nor `@noble/ciphers` exports base64; native Hermes/browser `btoa`/`atob` support confirmed for this repo's Expo SDK (57, past the SDK-51 baseline)                                                                                                                                                  | CRYPTOGRAPHIC_ARCHITECTURE.md §3                                            |
| `unlock()`'s Phase 2 `signInWithAuthSecret` re-verification call dropped, replaced with local AEAD unwrap                                                                                                  | Phase 3's `protectedVaultKey` unwrap-and-fail-closed is now the real local correctness signal Phase 2 lacked; re-authenticating an already-signed-in user on every unlock was redundant once it existed                                                                                                                     | CRYPTOGRAPHIC_ARCHITECTURE.md §11                                           |
| In-memory substring search over decrypted content, no persisted index (Phase 4, reconfirmed Phase 5)                                                                                                       | The full item set is already decrypted into memory to render the list, so a substring scan is free; Phase 5's offline cache stores encrypted envelopes only, so it doesn't change this — a plaintext search index still isn't worth building. Resolves PLAN.md's previously-open "local search index" risk                  | DATA_MODEL.md §6                                                            |
| Per-item DEK reused across edits (`reencryptItemContent` unwraps and re-encrypts under the _same_ key rather than rotating per save)                                                                       | Keeps `wrappedItemKey` stable/unchanged on every edit, minimizing update diffs; explicit per-edit DEK rotation would need its own future flow if ever required                                                                                                                                                              | packages/vault/src/itemCrypto.ts                                            |
| One generic, data-driven `ItemForm` (per-`ItemType` field-config array) instead of 11 hand-built forms                                                                                                     | `ItemContentBase` is genuinely shared and per-type deltas are small; extends the `CustomField` type-discrimination pattern DATA_MODEL.md already establishes to all fields, not just custom ones                                                                                                                            | packages/ui/src/fieldConfig.ts                                              |
| `image`/`pdf`/`file` item types modeled in the type system but excluded from the Add-item flow                                                                                                             | Attachment upload/storage is Phase 6; avoids building UI that would need reworking once real attachment storage lands                                                                                                                                                                                                       | DATA_MODEL.md §1, §6 (Phase 4 status note)                                  |
| No clipboard auto-clear on `SecretField`'s copy button in Phase 4                                                                                                                                          | Deferred to Phase 7's `packages/security/src/clipboard.ts` (currently a stub); documented limitation, not silently shipped as if handled                                                                                                                                                                                    | packages/ui/src/components/SecretField.tsx                                  |
| Phase 4b's React Native vault UI components live in `apps/mobile/src/components/`, not a new `packages/ui/native` subpath                                                                                  | Avoids adding a second (Jest-based) test runner inside `packages/ui`'s existing Vitest-only setup; only one mobile app exists today, so a shared package isn't yet justified — `fieldConfig.ts`/validation schemas stay shared                                                                                              | apps/mobile/src/components/                                                 |
| Real-time sync via `onSnapshot`'s own initial-snapshot-then-live-updates, no separate `updatedAt > lastSyncedAt` bootstrap query (Phase 5)                                                                 | Simpler; `onSnapshot` already handles the offline-cache-then-server transition correctly. Revisit only if a real vault size makes the initial full listener too slow                                                                                                                                                        | SYNC_ENGINE.md, packages/firebase/src/vaultItems.ts                         |
| Conflict UI always offers keep-mine/keep-server's/keep-both, never auto-detects "unambiguous" structured-item merges (Phase 5)                                                                             | SYNC_ENGINE.md never defined that detection; always-offer-all-three never silently loses data                                                                                                                                                                                                                               | apps/web/src/app/conflicts/page.tsx                                         |
| Offline vault-item cache implementation (IndexedDB via `idb` on web) lives in `apps/web/src/lib/localItemStore.ts`, not `packages/storage` itself                                                          | Same precedent as the Phase 4b UI-components decision above — one platform implementation today, avoids forcing a DOM-only dependency into a shared package                                                                                                                                                                 | packages/storage/src/vaultItemStore.ts                                      |
| Tombstone GC as a daily scheduled Cloud Function, Admin SDK, 30-day retention (Phase 5)                                                                                                                    | Matches SYNC_ENGINE.md §5's documented design exactly; least-privilege (touches only `deleted`/`updatedAt`/doc refs, never ciphertext fields)                                                                                                                                                                               | firebase/functions/src/tombstoneGc.ts                                       |
| Offline vault-item cache implementation on mobile (`@react-native-async-storage/async-storage`, one JSON blob per uid) lives in `apps/mobile/src/lib/localItemStore.ts`, not `packages/storage` (Phase 5b) | Same precedent as web's IndexedDB implementation and Phase 4b's UI-components decision — one platform implementation, avoids forcing a native-only dependency into a shared package                                                                                                                                         | packages/storage/src/vaultItemStore.ts                                      |
| Hydration (`ITEMS_LOADED`) must fully dispatch before the Firestore listener subscribes, on both platforms (Phase 5b correction)                                                                           | The original concurrent hydrate-and-subscribe fired both async paths at once; if a live update landed before the local-cache read resolved, the hydration dispatch's wholesale replace could wipe the update back out. Fixed by sequencing subscribe inside the same `startTransition` callback, after hydration's dispatch | apps/web/src/hooks/useVaultItems.ts, apps/mobile/src/hooks/useVaultItems.ts |
| Attachments scoped to dedicated Image/PDF/File item types only, not "attach a file to any item type" (Phase 6)                                                                                             | Matches the already-designed `AttachmentItemContent` shape exactly (one `attachmentId` per item); attach-to-any-item is a materially bigger UI surface not required by any existing doc — deferred, not silently dropped                                                                                                    | packages/types/src/vaultItem.ts's `AttachmentItemContent`                   |
| Attachment content encrypted as one whole AES-256-GCM buffer, no chunking/streaming (Phase 6)                                                                                                              | Reuses `encryptBytes`/`decryptBytes` unchanged, bounded by the already-deployed 50MB `storage.rules` cap; a real chunking scheme (per-chunk nonces, streaming upload) is new crypto work with no existing design, out of scope for this pass                                                                                | packages/vault/src/attachmentCrypto.ts                                      |
| Attachment content nonce travels inside the Storage blob (12 nonce bytes + ciphertext), not as an `AttachmentDocument` field (Phase 6)                                                                     | `AttachmentDocument`'s doc-specified shape has no nonce field — the blob is documented as "raw ciphertext," so the nonce has to live in the blob itself; also avoids a large file paying `bytesToBase64`'s byte-loop cost twice (once producing the envelope, again if re-encoded for Firestore)                            | packages/vault/src/attachmentCrypto.ts's `attachmentEnvelopeToBlob`         |
| PDF/generic-file preview uses system-viewer hand-off (object URL, browser/OS native handling), not a bundled in-app renderer (Phase 6)                                                                     | No new heavy rendering dependency this phase; images still get a real inline decrypted preview, which was the part users most need without leaving the app                                                                                                                                                                  | packages/ui/src/components/AttachmentPreview.tsx                            |
| `firestore.rules`' `attachments` subcollection gained `isValidAttachment` (previously only `ownerId`-checked, unlike `items`) (Phase 6)                                                                    | Closes a real field-completeness gap found while implementing this phase — fixed rather than left for a later hardening pass, per this project's established pattern                                                                                                                                                        | firebase/firestore.rules                                                    |
| Attachment GC is a separate scheduled function (`attachmentGc.ts`), not folded into `tombstoneGc.ts` (Phase 6)                                                                                             | An attachment tombstone has a Storage blob to delete first that an item tombstone doesn't; sharing `retentionCutoff` but not the delete logic keeps each function's privilege/behavior easy to review independently                                                                                                         | firebase/functions/src/attachmentGc.ts                                      |
| Process change: `apps/web` is taken to full completion before any further `apps/mobile` work resumes, replacing the prior per-phase "web then Xb" pattern (this session)                                   | User-directed strategy shift; the roadmap is split into a Web-completion track and a Mobile-completion track so mobile ports/parity work (Phase 6b onward) doesn't fragment attention until web reaches release                                                                                                             | PLAN.md §4                                                                  |

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

**Per explicit direction, this phase's code initially shipped without new
automated tests** — flagged deliberately, not silently dropped, and closed
as the immediate follow-up. `packages/crypto/src/aead.test.ts` (19 tests)
covers round-trips and every fail-closed tamper path from
`docs/CRYPTOGRAPHIC_ARCHITECTURE.md` §11: wrong key, modified auth tag/
ciphertext, modified/short nonce, unknown version/algorithm, malformed
base64, and confirms no partial plaintext is ever returned on a failed
decrypt. `tests/auth/authFlow.test.ts` gained three new cases exercising the
`VaultProvider` VEK generate/wrap/fetch/unwrap sequence against the real
Auth/Firestore/Functions emulators — including a wrong-master-password case
confirming the local AEAD unwrap fails closed independently of Firebase
rejecting the credential — rather than mocking Firebase to render the React
provider directly, consistent with this repo's existing pattern of testing
business logic at the package/flow level. A manual, line-by-line security
self-review of `aead.ts` against `docs/CRYPTOGRAPHIC_ARCHITECTURE.md` §3/§11
was additionally performed per `CLAUDE.md` §4 step 6.

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

Phase 4 (Vault — item CRUD) is complete for `apps/web`: `packages/types`
gains the full `VaultItemDocument`/`ItemContent` schema (all 11 `ItemType`s,
`CustomField`, the new `Address` type — see DATA_MODEL.md §2);
`packages/validation` gains matching Zod schemas (`itemContentSchema` as a
discriminated union, `vaultItemDocumentSchema` for the Firestore envelope);
`packages/password-generator` is now a real CSPRNG-based generator
(`@noble/hashes`'s `randomBytes`, unbiased rejection-sampled character
selection — no `Math.random()`); `packages/firebase` gains
`createVaultItem`/`fetchVaultItems`/`updateVaultItem`/`softDeleteVaultItem`
against `users/{uid}/items`; `packages/vault` gains `itemCrypto.ts`
(wrap/encrypt on create, unwrap-and-reencrypt on edit, unwrap-decrypt-parse-
validate on read, all fail-closed) and `itemCacheReducer.ts` (in-memory
decrypted item cache plus `selectVisibleItems`, Phase 4's search/tag/
favorites filter — see the decisions log above and DATA_MODEL.md §6);
`packages/ui` goes from a placeholder to real react-dom form primitives
(`TextField`, `SecretField`, `TagsInput`, `CustomFieldsEditor`,
`PasswordGeneratorPanel`, etc.) plus the generic `ItemForm` driven by
`fieldConfig.ts`; `apps/web` replaces the Phase 2/3 "your vault is empty"
stub with a real Vault Home (search/tags/favorites), Item Detail, Add/Edit
Item, and standalone Password Generator screens, wired through a new
`useVaultItems` hook that glues `packages/firebase`'s I/O to
`packages/vault`'s pure crypto/cache layers (mirroring how `VaultProvider`
already wires auth). `firebase/firestore.rules`' `isValidItem()` gained the
`favorite`/`attachmentRefs` fields it was missing (found while implementing
this phase) plus a `type` enum constraint; `tests/security` was extended to
cover both, plus other-than-`login` types and an `ownerId`-change-on-update
denial.

The `CLAUDE.md` §4 step 6 security review pass over `itemCrypto.ts`'s
key-wrap/DEK-reuse logic, `useVaultItems.ts`'s cache-clear-on-lock behavior,
the Firestore write path against the rules' compare-and-swap boundary, and
the password generator's RNG was performed this session — no issues found.
**Not yet done, flagged rather than assumed:** a manual click-through of the
web UI against the real Firebase emulator (carried-over gap from Phases 2-3
— no browser-automation tool available in this session either).

Phase 4b (porting Phase 4's screens to `apps/mobile`) is complete:
`apps/mobile/src/components/` gains React Native counterparts of every
`packages/ui` Phase 4 component (`TextField`, `SecretField` — using
`expo-clipboard` instead of `navigator.clipboard`, `TagsInput`,
`CustomFieldsEditor` — its field-type picker reuses the tag-chip
interaction pattern rather than a native `<select>`/picker dependency,
`PasswordGeneratorPanel` — a +/- length stepper instead of a native slider,
`ItemForm`, etc.), all consuming the same platform-agnostic
`packages/types`/`validation`/`password-generator`/`firebase`/`vault`
layers Phase 4 built, unchanged; `apps/mobile/src/hooks/useVaultItems.ts` is
a near-twin of web's hook, differing only in Firebase init (native
persistence via `getReactNativePersistence`/`AsyncStorage`, same pattern
`VaultProvider.tsx` already established); new Expo Router screens replace
the "Your vault is empty" stub (Vault Home, Item Detail, Add/Edit Item,
standalone Password Generator). See §12's decisions log for why these
components live in `apps/mobile/src/components/` rather than a new
`packages/ui/native` subpath. Security review for this pass (clipboard
limitation carried over, decrypted content confirmed never touching
`AsyncStorage`, cache-clear/decrypt-isolation behavior confirmed identical
to web since it's the same shared `@kryvex/vault` code) found no issues.
**Not yet done:** a manual click-through in Expo Go (same no-automation
caveat as web).

Phase 5 (Sync) is complete for `apps/web`: `packages/sync` goes from a
placeholder to a real, platform-agnostic sync/conflict engine
(`syncState.ts` — `beginLocalWrite`/`confirmLocalWrite`/`rejectLocalWrite`/
`applyRemoteDoc`/`dismissConflict`, tracking per-item
synced/pending/conflict status and the two envelopes behind an unresolved
conflict; zero Firebase/React/crypto dependency, same principle
`@kryvex/vault`'s reducers already follow — the consuming hook owns all
encryption, reusing Phase 4's `itemCrypto` primitives unchanged, including
for "keep both" which goes through the normal create path so the new item
gets its own fresh DEK); `packages/storage` gains the `VaultItemLocalStore`
interface (concrete IndexedDB implementation lives in
`apps/web/src/lib/localItemStore.ts` via the `idb` library — see §12's
decisions log for why it's app-local, not shared); `packages/firebase`
replaces the one-shot `fetchVaultItems` read (kept only for `apps/mobile`,
not yet migrated) with `subscribeToVaultItems` (real-time `onSnapshot`) and
adds `fetchVaultItem` (single-doc re-fetch for the conflict path);
`apps/web/src/hooks/useVaultItems.ts` is rewritten offline-first: hydrates
from IndexedDB immediately, then reconciles against the live listener,
tracks pending writes with enough state (`baseRevision`, `writeKind`) to
retry them via a new `apps/web/src/hooks/useOnlineStatus.ts` connectivity
hook when the network returns, and classifies a rejected write's Firestore
error code to distinguish a real conflict from an offline/network failure;
Vault Home gets a conflicts banner and a new `/conflicts` page lists every
unresolved conflict with all three resolutions always offered (see §12's
decisions log for both scope decisions this phase made against
`docs/SYNC_ENGINE.md`'s design). `firebase/functions` gains `tombstoneGc`
(daily scheduled function, 30-day retention, Admin SDK, envelope-metadata-
only), and `firebase/firestore.indexes.json` gains the composite index its
collection-group query needs.

The `CLAUDE.md` §4 step 6 security review pass (local IndexedDB cache
confirmed ciphertext-only, conflict resolution confirmed never persisting
the "losing" side's plaintext, "keep both" confirmed to mint a fresh DEK,
`tombstoneGc` confirmed to touch only envelope metadata, listener lifecycle
confirmed to unsubscribe on unmount/lock) was performed this session — no
issues found. **Not yet done:** a manual click-through against the real
Firebase emulator exercising the offline/reconnect/conflict flows (same
no-automation caveat as every prior phase).

Phase 5b (porting Phase 5's sync engine to `apps/mobile`) is complete:
`apps/mobile/src/lib/localItemStore.ts` implements `VaultItemLocalStore`
over `@react-native-async-storage/async-storage` (one JSON blob per uid,
keyed `kryvex-vault-cache:${uid}`); `apps/mobile/src/hooks/useOnlineStatus.ts`
uses the new `@react-native-community/netinfo` dependency (RN has no
`navigator.onLine`) — offline is only ever a confirmed `isConnected: false`,
never an undetermined `isInternetReachable: null`, so unknown connectivity
doesn't block retries; `apps/mobile/src/hooks/useVaultItems.ts` is a near-
exact mirror of web's hook (same `@kryvex/sync` conflict bookkeeping, same
`@kryvex/vault` cache reducer); a conflicts banner was added to the Home
screen and a new `apps/mobile/src/app/conflicts.tsx` mirrors web's
resolution screen with the same three always-offered resolutions.

**Correction made during this phase (applies to both platforms):** the
original Phase 5 hydrate-then-subscribe effect started the local-cache read
and the Firestore listener subscription concurrently (`startTransition`
kicked off the async hydration read, then `subscribeToVaultItems` was called
immediately after, synchronously). This raced the two paths: if the
listener delivered a live update before the hydration read's promise
resolved, the hydration dispatch (`ITEMS_LOADED`, a wholesale cache replace)
could land _after_ the listener's `ITEM_UPSERTED` and silently wipe the
freshly-synced item back out. Mobile's Jest/`@testing-library/react-native`
environment exposed this deterministically; the same code path exists in
web's hook and carries the same latent risk even though Vitest's timing
happened not to trigger it. Fixed in both `apps/web/src/hooks/useVaultItems.ts`
and `apps/mobile/src/hooks/useVaultItems.ts` by moving the
`subscribeToVaultItems` call inside the same `startTransition` async
callback, immediately after the `ITEMS_LOADED` dispatch — hydration is now
guaranteed to fully land before the listener attaches, matching what the
effect's own comment always claimed it did.

A second, unrelated mobile-only test-infra issue was found and fixed:
`@testing-library/react-native` v14's `act()` and `unmount()` are always
internally async (they wrap the given callback in an `async` function
regardless of whether it's synchronous), so a test that calls `act(() => {...})`
or `unmount()` without `await` can move on to its next assertion before the
update actually flushes. Every mobile test's `act()`/`unmount()` call site
was updated to `await` it (`apps/mobile/src/hooks/useVaultItems.test.ts`,
`useOnlineStatus.test.ts`) — same category as the already-established "await
`render`/`renderHook`/`fireEvent`" rule for this environment, now extended to
`act`/`unmount` too.

The `CLAUDE.md` §4 step 6 security review pass (AsyncStorage cache confirmed
ciphertext-envelope-only, conflict resolution confirmed never persisting the
"losing" side's plaintext, "keep both" confirmed to mint a fresh DEK via
`encryptItemContent` rather than reusing the conflicting item's, listener
lifecycle confirmed to unsubscribe on unmount/lock via the
`[uid, vaultEncryptionKey]` dependency array tearing down the previous
effect) was performed this session — no issues found. **Not yet done:** a
manual click-through in Expo Go exercising the offline/reconnect/conflict
flows (same no-automation caveat as every prior phase).

Phase 6 (Attachments) is complete for `apps/web`; `apps/mobile` is the
explicit Phase 6b follow-up. New shared packages/types:
`packages/types/src/attachment.ts`'s `AttachmentDocument` and
`packages/validation/src/attachment.ts`'s `attachmentDocumentSchema`
(mirroring `vaultItem.ts`'s exact style); `packages/vault/src/attachmentCrypto.ts`
adds `encryptAttachment`/`decryptAttachmentContent`/`decryptAttachmentFileName`
(same generateKey/encryptBytes/decryptBytes reuse as `itemCrypto.ts`, whole-
buffer only) plus `attachmentEnvelopeToBlob`/`blobToAttachmentEnvelope` for
framing the Storage blob (nonce bytes + ciphertext bytes, since
`AttachmentDocument` has no separate nonce field — see DATA_MODEL.md §3's
implementation note); `packages/firebase/src/attachments.ts` adds Firestore
CRUD (`createAttachmentDocument`/`fetchAttachmentDocument`/
`softDeleteAttachmentDocument`) and the first real Storage I/O in this repo
(`uploadAttachmentBlob`/`downloadAttachmentBlob`, capped at 50MB matching
`storage.rules`). `packages/ui` gains `AttachmentUploadForm` (the Add-flow's
file picker, deliberately separate from the generic `ItemForm` — an async
upload sequence doesn't fit `ItemForm`'s synchronous submit contract) and
`AttachmentPreview` (Item Detail's rendering: inline decrypted preview for
images, system-viewer hand-off — an object URL opened via the browser's own
PDF/file handling, never a bundled renderer — for everything else); a small
`ItemForm` fix (spread `initialContent` before the edited fields in its
submit candidate) was needed so editing an attachment item doesn't drop its
immutable `attachmentId` (not part of `ITEM_TYPE_FIELD_CONFIG.image/pdf/file`,
which is deliberately empty — see §12's decisions log). `apps/web` wires it
all: `item/new` branches to `AttachmentUploadForm` for Image/PDF/File
(pre-generating the item id via a new exported `useVaultItems.newItemId` so
the `AttachmentDocument.itemId` back-reference can exist before the item
itself does), a new `useCreateAttachment`/`useAttachment` hook pair owns the
encrypt-then-upload and fetch-metadata-then-lazy-download flows, and
`useVaultItems.softDeleteItem` cascades a best-effort tombstone to every
attachment the deleted item referenced. `firebase/firestore.rules` gained
`isValidAttachment` (closing a field-completeness gap the `attachments`
subcollection had relative to `items`), and `firebase/functions/src/attachmentGc.ts`
(new, mirrors `tombstoneGc.ts`, also deletes the Storage blob before the
Firestore hard-delete). `tests/security` gained a new `storage.rules.test.ts`
(none existed before this phase, despite `storage.rules` itself already being
real).

Scope confirmed with the user before implementation (see §12's decisions
log): dedicated Image/PDF/File item types only (not "attach a file to any
item type"); whole-buffer encryption (no chunking); system-viewer hand-off
for previews (no bundled PDF renderer); web first, mobile as Phase 6b; and
yes to closing the rules gap + adding attachment GC in this same pass.

The `CLAUDE.md` §4 step 6 security review pass (fresh DEK per attachment
confirmed, fail-closed decrypt error message confirmed, raw file bytes never
logged, the upload flow confirmed to never write the raw `File`/plaintext
anywhere before `encryptAttachment` runs, `AttachmentPreview`'s object URLs
confirmed revoked — on unmount for the image-preview path, after a bounded
delay for the download/open-PDF path, `isValidAttachment` confirmed via the
emulator test to actually reject a malformed document rather than just by
inspection, `attachmentGc` confirmed least-privilege — reads only
`deleted`/`updatedAt`/`storagePath`, never the wrapped key or ciphertext
fields — and confirmed a missing/already-gone Storage blob doesn't crash the
scheduled run, the cascade soft-delete in `useVaultItems.softDeleteItem`
confirmed non-blocking on an attachment-doc write failure) was performed
this session — no issues found. **Not yet done:** a manual browser
click-through exercising upload → preview → download → delete → GC (same
no-automation caveat as every prior phase).

**Strategy change (this session):** `apps/web` is now taken to full
completion before any further `apps/mobile` work resumes — Phase 6b
(porting attachments to `apps/mobile`) is deferred, not skipped, until the
web-completion track (`PLAN.md` §4's Track A) reaches release. Phase 7w
(web session security — real `packages/security/autoLock.ts`/`clipboard.ts`
implementations) is the next scheduled step — see `PLAN.md`.
