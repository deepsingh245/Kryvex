# Kryvex — Source of Truth

Status: **Phase 9w (security hardening, web + shared packages) complete.**
This is the primary project reference. Read this before any other file
when picking up work on Kryvex.
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

Envelope/`ItemContent` split, all 12 item types (Login, Email, Secure Note,
Identity, Card, PIN, API Key, Recovery Codes, Image, PDF, File, Custom),
attachment model, field-level encryption rationale table:
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

| Decision                                                                                                                                                                                                                                 | Rationale                                                                                                                                                                                                                                                                                                                   | Reference                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Envelope encryption (per-item/attachment DEKs, not direct Vault-Key encryption)                                                                                                                                                          | Cheap key rotation; future sharing without re-encrypting content                                                                                                                                                                                                                                                            | CRYPTOGRAPHIC_ARCHITECTURE.md §2                                                     |
| Titles/tags encrypted, not left plaintext                                                                                                                                                                                                | Metadata itself can be sensitive                                                                                                                                                                                                                                                                                            | CRYPTOGRAPHIC_ARCHITECTURE.md §5                                                     |
| `favorite` flag left plaintext                                                                                                                                                                                                           | Low-sensitivity sorting convenience; explicitly flagged exception                                                                                                                                                                                                                                                           | DATA_MODEL.md §5                                                                     |
| Attachment `mimeType`/`sizeBytes` left plaintext                                                                                                                                                                                         | Needed for non-decrypting UI/quota; low sensitivity                                                                                                                                                                                                                                                                         | DATA_MODEL.md §5                                                                     |
| Hard deletes disallowed client-side; tombstones only                                                                                                                                                                                     | Enables correct offline conflict/delete semantics                                                                                                                                                                                                                                                                           | SYNC_ENGINE.md §5                                                                    |
| Recovery via user-held Recovery Key, no server escrow                                                                                                                                                                                    | Preserves zero-knowledge guarantee; explicit unrecoverable-if-lost tradeoff                                                                                                                                                                                                                                                 | RECOVERY.md §1                                                                       |
| Firebase Auth value ≠ master password (HKDF-derived)                                                                                                                                                                                     | Compromised Firebase credential must not reveal master password                                                                                                                                                                                                                                                             | CRYPTOGRAPHIC_ARCHITECTURE.md §4                                                     |
| Prelogin via a narrow unauthenticated Cloud Function (`getKdfParams`), not a deterministic/email-derived salt or a public Firestore lookup collection                                                                                    | Deterministic salt lets an attacker precompute it fully offline; a public collection needs a second copy of the salt kept in sync on every param rotation                                                                                                                                                                   | CRYPTOGRAPHIC_ARCHITECTURE.md §4.1                                                   |
| Argon2id/HKDF pulled into Phase 2 (not deferred to Phase 3 as originally planned)                                                                                                                                                        | The Firebase Auth credential is itself HKDF-derived from the master password — Phase 2 auth can't be correct without it; Phase 3 now covers only AES-256-GCM item/attachment encryption and key wrapping                                                                                                                    | PLAN.md, CRYPTOGRAPHIC_ARCHITECTURE.md §4                                            |
| Pure-JS Argon2id (`@noble/hashes`) on mobile, not WASM/native                                                                                                                                                                            | Plain Expo Go (no `expo prebuild`) can't run WASM in Hermes or link native modules; revisit once native tooling lands (Phase 7/10)                                                                                                                                                                                          | DEVELOPMENT.md                                                                       |
| Pure-JS AES-256-GCM (`@noble/ciphers`) for Phase 3, not WASM/native                                                                                                                                                                      | Same plain-Expo-Go constraint as Argon2id above; same profile/dependency family as `@noble/hashes`, already proven                                                                                                                                                                                                          | DEVELOPMENT.md                                                                       |
| Hand-rolled `btoa`/`atob` base64 wrapper in `packages/crypto`, not a new dependency                                                                                                                                                      | Neither `@noble/hashes` nor `@noble/ciphers` exports base64; native Hermes/browser `btoa`/`atob` support confirmed for this repo's Expo SDK (57, past the SDK-51 baseline)                                                                                                                                                  | CRYPTOGRAPHIC_ARCHITECTURE.md §3                                                     |
| `unlock()`'s Phase 2 `signInWithAuthSecret` re-verification call dropped, replaced with local AEAD unwrap                                                                                                                                | Phase 3's `protectedVaultKey` unwrap-and-fail-closed is now the real local correctness signal Phase 2 lacked; re-authenticating an already-signed-in user on every unlock was redundant once it existed                                                                                                                     | CRYPTOGRAPHIC_ARCHITECTURE.md §11                                                    |
| In-memory substring search over decrypted content, no persisted index (Phase 4, reconfirmed Phase 5)                                                                                                                                     | The full item set is already decrypted into memory to render the list, so a substring scan is free; Phase 5's offline cache stores encrypted envelopes only, so it doesn't change this — a plaintext search index still isn't worth building. Resolves PLAN.md's previously-open "local search index" risk                  | DATA_MODEL.md §6                                                                     |
| Per-item DEK reused across edits (`reencryptItemContent` unwraps and re-encrypts under the _same_ key rather than rotating per save) — **re-reviewed and confirmed in Phase 9w**, not just a Phase 4-era assumption                     | Keeps `wrappedItemKey` stable/unchanged on every edit, minimizing update diffs; AES-256-GCM's safety comes from never reusing a nonce under a key, not from limiting key reuse — `encryptBytes` always draws a fresh CSPRNG nonce per call, so repeated encryption under the same DEK is safe. Explicit per-edit rotation would need its own future flow if ever required for other reasons | packages/vault/src/itemCrypto.ts                                                     |
| One generic, data-driven `ItemForm` (per-`ItemType` field-config array) instead of 11 hand-built forms                                                                                                                                   | `ItemContentBase` is genuinely shared and per-type deltas are small; extends the `CustomField` type-discrimination pattern DATA_MODEL.md already establishes to all fields, not just custom ones                                                                                                                            | packages/ui/src/fieldConfig.ts                                                       |
| `image`/`pdf`/`file` item types modeled in the type system but excluded from the Add-item flow                                                                                                                                           | Attachment upload/storage is Phase 6; avoids building UI that would need reworking once real attachment storage lands                                                                                                                                                                                                       | DATA_MODEL.md §1, §6 (Phase 4 status note)                                           |
| No clipboard auto-clear on `SecretField`'s copy button in Phase 4                                                                                                                                                                        | Deferred to Phase 7's `packages/security/src/clipboard.ts` (currently a stub); documented limitation, not silently shipped as if handled                                                                                                                                                                                    | packages/ui/src/components/SecretField.tsx                                           |
| Phase 4b's React Native vault UI components live in `apps/mobile/src/components/`, not a new `packages/ui/native` subpath                                                                                                                | Avoids adding a second (Jest-based) test runner inside `packages/ui`'s existing Vitest-only setup; only one mobile app exists today, so a shared package isn't yet justified — `fieldConfig.ts`/validation schemas stay shared                                                                                              | apps/mobile/src/components/                                                          |
| Real-time sync via `onSnapshot`'s own initial-snapshot-then-live-updates, no separate `updatedAt > lastSyncedAt` bootstrap query (Phase 5)                                                                                               | Simpler; `onSnapshot` already handles the offline-cache-then-server transition correctly. Revisit only if a real vault size makes the initial full listener too slow                                                                                                                                                        | SYNC_ENGINE.md, packages/firebase/src/vaultItems.ts                                  |
| Conflict UI always offers keep-mine/keep-server's/keep-both, never auto-detects "unambiguous" structured-item merges (Phase 5)                                                                                                           | SYNC_ENGINE.md never defined that detection; always-offer-all-three never silently loses data                                                                                                                                                                                                                               | apps/web/src/app/conflicts/page.tsx                                                  |
| Offline vault-item cache implementation (IndexedDB via `idb` on web) lives in `apps/web/src/lib/localItemStore.ts`, not `packages/storage` itself                                                                                        | Same precedent as the Phase 4b UI-components decision above — one platform implementation today, avoids forcing a DOM-only dependency into a shared package                                                                                                                                                                 | packages/storage/src/vaultItemStore.ts                                               |
| Tombstone GC as a daily scheduled Cloud Function, Admin SDK, 30-day retention (Phase 5)                                                                                                                                                  | Matches SYNC_ENGINE.md §5's documented design exactly; least-privilege (touches only `deleted`/`updatedAt`/doc refs, never ciphertext fields)                                                                                                                                                                               | firebase/functions/src/tombstoneGc.ts                                                |
| Offline vault-item cache implementation on mobile (`@react-native-async-storage/async-storage`, one JSON blob per uid) lives in `apps/mobile/src/lib/localItemStore.ts`, not `packages/storage` (Phase 5b)                               | Same precedent as web's IndexedDB implementation and Phase 4b's UI-components decision — one platform implementation, avoids forcing a native-only dependency into a shared package                                                                                                                                         | packages/storage/src/vaultItemStore.ts                                               |
| Hydration (`ITEMS_LOADED`) must fully dispatch before the Firestore listener subscribes, on both platforms (Phase 5b correction)                                                                                                         | The original concurrent hydrate-and-subscribe fired both async paths at once; if a live update landed before the local-cache read resolved, the hydration dispatch's wholesale replace could wipe the update back out. Fixed by sequencing subscribe inside the same `startTransition` callback, after hydration's dispatch | apps/web/src/hooks/useVaultItems.ts, apps/mobile/src/hooks/useVaultItems.ts          |
| Attachments scoped to dedicated Image/PDF/File item types only, not "attach a file to any item type" (Phase 6)                                                                                                                           | Matches the already-designed `AttachmentItemContent` shape exactly (one `attachmentId` per item); attach-to-any-item is a materially bigger UI surface not required by any existing doc — deferred, not silently dropped                                                                                                    | packages/types/src/vaultItem.ts's `AttachmentItemContent`                            |
| Attachment content encrypted as one whole AES-256-GCM buffer, no chunking/streaming (Phase 6)                                                                                                                                            | Reuses `encryptBytes`/`decryptBytes` unchanged, bounded by the already-deployed 50MB `storage.rules` cap; a real chunking scheme (per-chunk nonces, streaming upload) is new crypto work with no existing design, out of scope for this pass                                                                                | packages/vault/src/attachmentCrypto.ts                                               |
| Attachment content nonce travels inside the Storage blob (12 nonce bytes + ciphertext), not as an `AttachmentDocument` field (Phase 6)                                                                                                   | `AttachmentDocument`'s doc-specified shape has no nonce field — the blob is documented as "raw ciphertext," so the nonce has to live in the blob itself; also avoids a large file paying `bytesToBase64`'s byte-loop cost twice (once producing the envelope, again if re-encoded for Firestore)                            | packages/vault/src/attachmentCrypto.ts's `attachmentEnvelopeToBlob`                  |
| PDF/generic-file preview uses system-viewer hand-off (object URL, browser/OS native handling), not a bundled in-app renderer (Phase 6)                                                                                                   | No new heavy rendering dependency this phase; images still get a real inline decrypted preview, which was the part users most need without leaving the app                                                                                                                                                                  | packages/ui/src/components/AttachmentPreview.tsx                                     |
| `firestore.rules`' `attachments` subcollection gained `isValidAttachment` (previously only `ownerId`-checked, unlike `items`) (Phase 6)                                                                                                  | Closes a real field-completeness gap found while implementing this phase — fixed rather than left for a later hardening pass, per this project's established pattern                                                                                                                                                        | firebase/firestore.rules                                                             |
| Attachment GC is a separate scheduled function (`attachmentGc.ts`), not folded into `tombstoneGc.ts` (Phase 6)                                                                                                                           | An attachment tombstone has a Storage blob to delete first that an item tombstone doesn't; sharing `retentionCutoff` but not the delete logic keeps each function's privilege/behavior easy to review independently                                                                                                         | firebase/functions/src/attachmentGc.ts                                               |
| Process change: `apps/web` is taken to full completion before any further `apps/mobile` work resumes, replacing the prior per-phase "web then Xb" pattern (this session)                                                                 | User-directed strategy shift; the roadmap is split into a Web-completion track and a Mobile-completion track so mobile ports/parity work (Phase 6b onward) doesn't fragment attention until web reaches release                                                                                                             | PLAN.md §4                                                                           |
| Recovery flow requires both an emailed reset link (proves control of the inbox) and the Recovery Key (proves possession of the kit) — neither alone completes recovery (Phase 7w)                                                        | The derived `authSecret` is also unknown once the master password is forgotten, so normal sign-in can't gate the Auth-credential change; Firebase's own oobCode flow is a real, independent security factor here, not a workaround                                                                                          | apps/web/src/providers/VaultProvider.tsx's `recoverVault`                            |
| No QR code in the Emergency Kit — text + downloadable file only (Phase 7w)                                                                                                                                                               | Avoids a new dependency this pass; the Recovery Key is already short enough to transcribe/download reliably as hex                                                                                                                                                                                                          | packages/ui/src/components/EmergencyKit.tsx                                          |
| Auto-lock timeout and clipboard-clear delay are hardcoded (5 min / 30s) rather than reading `settings.autoLockMinutes`/`clipboardClearSeconds` back from the profile (Phase 7w)                                                          | Matches the values already written at sign-up; wiring a settings screen to actually change them is Phase 8w scope, not this pass                                                                                                                                                                                            | apps/web/src/providers/VaultProvider.tsx, packages/ui/src/components/SecretField.tsx |
| Clipboard auto-clear only clears if the clipboard still holds exactly what was copied (read-before-write), never blindly (Phase 7w)                                                                                                      | Avoids wiping something unrelated the user copied in the meantime — same principle established password managers follow                                                                                                                                                                                                     | packages/security/src/clipboard.ts                                                   |
| Settings (`autoLockMinutes`/`clipboardClearSeconds`/`biometricUnlockEnabled`) kept as local React state in `apps/web/src/providers/VaultProvider.tsx`, not added to the shared `@kryvex/vault` `LockState`/`lockStateReducer` (Phase 8w) | Same reasoning as Phase 7w's `lock()` addition — this state is web-specific UI state, not part of the cross-platform lock state machine `apps/mobile`'s own `VaultProvider.tsx` also depends on; avoids touching a shared reducer for a web-only concern                                                                    | apps/web/src/providers/VaultProvider.tsx                                             |
| No new shared `LoadingState`/`ErrorBanner`/`EmptyState` component in `packages/ui`; the existing per-page inline pattern (`<p role="alert">`/`<p className="text-gray-500">`) is reused instead (Phase 8w)                               | Every page already follows one consistent pattern; introducing an abstraction wasn't warranted by what was actually missing (three specific silent-failure gaps, not a systemic one) — revisit only if duplication becomes a real maintenance problem                                                                       | apps/web/src/app/page.tsx, conflicts/page.tsx                                        |
| No automated accessibility tooling (e.g. axe-core in CI) added this phase (Phase 8w)                                                                                                                                                     | Targeted, manually-identified accessibility fixes were in scope; broader automated coverage is candidate scope for Phase 9w (security/quality hardening), not this pass                                                                                                                                                     | PLAN.md                                                                              |
| KDF-params upgrade path (rehash-on-unlock if policy strengthens) deferred, not built in Phase 9w                                                                                                                                         | Today's shipped Argon2id params (64 MiB/t=3/p=1) already meet the documented target — this is real but non-urgent feature work (silently re-deriving keys and re-wrapping the VEK on a successful unlock), not a hardening-review-pass fix; tracked as a follow-up                                                        | docs/CRYPTOGRAPHIC_ARCHITECTURE.md §6                                                |
| Best-effort key-buffer zeroing (`wipeBytes`) added for `masterKey`/`authKeyBytes` (in `deriveAuthAndStretchedKey`'s callers) and `stretchedMasterKey`/`vaultEncryptionKey` (in `lockStateReducer`'s `LOCK_REQUESTED`), Phase 9w           | Shrinks the window raw key material sits in memory after use; explicitly documented as defense-in-depth, not a guarantee — JS has no secure-erase primitive. Wiping lives in the shared reducer (not each app's own `lock()` wrapper) since the reducer always has the true current state, avoiding a stale-closure bug a component-level wipe would risk | packages/crypto/src/wipe.ts, packages/vault/src/lockStateMachine.ts                  |
| Firebase App Check wired on `apps/web` (reCAPTCHA v3 + emulator debug-token mode) but `enforceAppCheck` left off on every Cloud Function, Phase 9w                                                                                       | `apps/mobile` has no App Check wiring at all yet (deferred to Track B); enforcing now would lock mobile users out of sign-up/sign-in/recovery. Also corrects `docs/FIREBASE_SECURITY.md` §4, which previously overstated App Check as already "enabled"                                                                     | packages/firebase/src/app.ts, docs/FIREBASE_SECURITY.md §4                          |
| `firestore.rules`' `users/{uid}` create/update rules gained `isValidKdfParams` (floors `kdfParams` at the shipped Argon2id defaults), Phase 9w                                                                                           | No validation existed at all before — a compromised or buggy client could write arbitrarily weak Argon2id parameters into its own profile doc, cheapening a future offline attack if the wrapped keys were also exfiltrated. Only floors the values; a stronger future policy can still raise them                        | firebase/firestore.rules, tests/security/firestore.rules.test.ts                    |
| Five non-cryptographic ID-generation `Math.random()` fallbacks (used only when `crypto.randomUUID` is unavailable) replaced with a CSPRNG-backed fallback in `apps/web`/`packages/ui`; `apps/mobile`'s two mirrors left as-is, Phase 9w   | Not exploitable (worst case is an ID collision, not a confidentiality/integrity break), but a literal violation of CLAUDE.md's absolute "never `Math.random()`" wording — closed for policy consistency where in scope; mobile is frozen per the Track A/B split                                                            | apps/web/src/hooks/useVaultItems.ts, useCreateAttachment.ts, packages/ui/src/components/CustomFieldsEditor.tsx |
| `react/no-danger` added to the shared ESLint config, Phase 9w                                                                                                                                                                            | Nothing in the codebase uses `dangerouslySetInnerHTML` today (confirmed repo-wide) — this locks that state in defensively rather than fixing a live bug, since a vault app rendering decrypted user content is exactly where an XSS sink would matter most                                                                 | packages/eslint-config/react.js                                                     |
| Standalone "Notes" field removed from the Add/Edit Item form (all types), but `ItemContentBase.notes` kept in the type/schema and still shown on Item Detail (web-only, post-9w)                                                        | User feedback: too many fields for a quick entry; Custom Fields' multiline option already covers free text, making a dedicated Notes input redundant — a pure UI change, no data loss for existing items                                                                                                                    | packages/ui/src/components/ItemForm.tsx, AttachmentUploadForm.tsx                    |
| New "Email" item type (just `email`/`password`) plus a new `"copyText"` field kind/`CopyableTextField` component (visible-by-default, Copy button, no reveal toggle, no clipboard auto-clear) — web-only, `apps/mobile` deferred (post-9w) | User feedback: wanted a minimal email-only entry, distinct from Login's fuller field set; email isn't sensitive the way a password is, so it shouldn't be masked like `SecretField`. `apps/mobile`'s field-kind/item-type switches are non-exhaustive and degrade gracefully, so this is safe to ship web-only under the Track A/B split | packages/ui/src/fieldConfig.ts, CopyableTextField.tsx, packages/types/src/vaultItem.ts |
| Add flow skips the type picker when the URL already implies a concrete category (`?type=` on `/item/new`); the aggregate "Files" bucket keeps a picker but narrowed to Image/PDF/File only; Cancel from a skipped picker returns to the filtered category instead of surfacing a picker screen never shown (post-9w) | User feedback: an extra click to re-pick a type you're already filtered to was pure friction. "Files" isn't one concrete `ItemType`, so it can't fully skip; the Cancel-destination fix avoids a UX regression the naive version of this change would have introduced | apps/web/src/app/(vault)/item/new/page.tsx, (vault)/page.tsx |
| Tags and Custom Fields collapse behind "+ Add tags"/"+ Add custom field" buttons on the Add/Edit form, auto-expanding only when the item being edited already has data (post-9w) | User feedback: both sections rendering fully open by default added visual noise to a "quick entry" flow; auto-expand-if-populated avoids hiding existing data behind an extra click on Edit | packages/ui/src/components/ItemForm.tsx, AttachmentUploadForm.tsx |
| Email category gets a dense list view (every item's Email/Password shown inline via `CopyableTextField`/`SecretField`, reusing both unchanged) toggled against the normal one-by-one list, defaulting to dense (post-9w) | User feedback: clicking into each item just to find one password was the exact friction point; no shared Toggle/Tabs primitive existed, so the toggle reuses the tag-filter-pill idiom already in `(vault)/page.tsx` rather than adding a new one for a single use site | apps/web/src/components/vault/EmailDenseList.tsx, (vault)/page.tsx |
| `Select` rewritten from a token-styled native `<select>` to a custom listbox (button trigger + `role="listbox"` popup), no new dependency (post-9w) | A native select's dropdown popup can't be themed (border-radius, shadow, selected-row color) across browsers — it looked visibly out of theme against the dark UI no matter how the trigger itself was styled. `onChange` changed from a synthetic-event shape to a plain `(value: string) => void`; both call sites (Settings' two selects, `CustomFieldsEditor`'s field-type picker) and their tests updated to match | packages/ui/src/components/ui/select.tsx |
| Web Hosting choice resolved: Firebase Hosting (via its Next.js framework integration), not Vercel — previously left open as a Phase 1 TBD (post-9w) | Project owner is deploying everything through Firebase; keeping the whole stack on one platform avoids a second deploy target/credential set for no benefit here | docs/DEPLOYMENT.md §6 |
| `firebase/functions/package.json` carries zero `@kryvex/*` workspace deps and zero `catalog:` versions — real pinned npm semver only; its one type-only cross-package need (`UserProfileDocument`) is a small hand-synced local mirror (`src/userProfileShape.ts`) instead (post-9w, first real `firebase deploy --only functions` attempt, two iterations) | Discovered live: Cloud Build's remote `npm install` for the deployed bundle processes the *whole* package.json — dependencies and devDependencies both — and plain npm can't resolve pnpm's `workspace:*`/`catalog:` protocols at all (first attempt moved the one workspace dep to devDependencies alone and still failed identically, proving the dependencies-only theory wrong). A `paths`-based tsconfig mapping straight to `packages/types/src` was tried next but rejected by `tsc`'s `rootDir` check (pulls a sibling-package file outside this package's `src/`) — the local mirror sidesteps both problems, mirroring the accepted-duplicate precedent already set by firestore.rules' `ITEM_TYPES` list | firebase/functions/package.json, firebase/functions/src/userProfileShape.ts, docs/DEPLOYMENT.md §5 |

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

- **V1** (current target): auth, encrypted vault, all 12 item types, password
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
web-completion track (`PLAN.md` §4's Track A) reaches release.

Phase 7w (web session security + Recovery Key) is complete. Three real
gaps closed, confirmed with the user before implementation (dedicated
AskUserQuestion round): no recovery mechanism at all, no auto-lock, no
clipboard auto-clear.

**Recovery Key / Emergency Kit** (full `docs/RECOVERY.md` flow, not just a
warning): `packages/vault/src/recoveryKey.ts` adds
`formatRecoveryKey`/`parseRecoveryKey` (hex, dash-grouped, reusing
`@kryvex/crypto`'s existing `bytesToHex`/`hexToBytes` — the key itself is
just another `generateKey()` call, same primitive as the VEK).
`firebase/functions/src/getRecoveryEnvelope.ts` mirrors `getKdfParams.ts`
exactly — unauthenticated, Admin SDK, returns only
`{ protectedVaultKeyByRecovery }` — solving the same prelogin-style
chicken-and-egg problem (a user who forgot their master password also
doesn't know the derived `authSecret`, so can't sign in normally to read
their own profile doc). `packages/firebase/src/auth.ts` gains
`sendVaultRecoveryEmail`/`verifyRecoveryCode`/`confirmVaultRecovery`,
thin wrappers around Firebase's own `sendPasswordResetEmail`/
`verifyPasswordResetCode`/`confirmPasswordReset` — this oobCode flow is
what actually lets the Auth credential change, and doubles as an
independent "prove you control the email inbox" factor alongside Recovery
Key possession; neither alone completes recovery. `VaultProvider.tsx` gains
`recoverVault` (mirrors `signUp`'s exact `pendingUnlock` auto-unlock
mechanism) and `signUp` now also generates/wraps a Recovery Key and returns
it for display. `packages/ui/src/components/EmergencyKit.tsx` (new) shows
the key once, with a download-as-file button and a required acknowledgment
checkbox — no QR code this pass (explicit scope trim). New pages:
`apps/web/src/app/recover` (request the email) and
`apps/web/src/app/recover/confirm` (oobCode + Recovery Key + new master
password; needed a `<Suspense>` wrapper around its `useSearchParams()` use
for static prerendering to succeed). A new `tests/auth` describe block
exercises the full flow against the real Auth/Firestore/Functions
emulators, including fetching the oobCode from the Auth emulator's own
testing REST endpoint (no real email delivery needed).

**Auto-lock**: `packages/security/src/autoLock.ts` replaces its stub with
a pure, dependency-free `createInactivityTimer` (plain `setTimeout`, no DOM
— stays shared with `apps/mobile` for whenever Track B resumes).
`VaultProvider.tsx` wires it: active only while `UNLOCKED`, resets on
mouse/keyboard/touch activity, locks immediately on `visibilitychange`
going hidden, and exposes a new `lock(reason?)` method (dispatches the
already-modeled-but-never-used `LOCK_REQUESTED`/`LOCK_COMPLETED` — no
`packages/vault` changes needed). A "Lock" button was added to Vault Home
next to "Sign out".

**Clipboard auto-clear**: `packages/security/src/clipboard.ts` replaces its
stub with `copyWithAutoClear`, dependency-injected (`ClipboardIO` — no
`navigator` reference in the package, since that API doesn't exist on
React Native) — clears the clipboard after a delay only if it still holds
exactly what was copied, never blindly wiping something else the user
copied in the meantime. `SecretField.tsx` now calls it instead of a bare
`writeText`.

Both auto-lock and clipboard-clear use hardcoded defaults (5 min / 30s,
matching the values already written to `settings` at sign-up) rather than
reading that per-account setting back — an explicit scope trim; a settings
screen to change them is Phase 8w.

The `CLAUDE.md` §4 step 6 security review pass (Recovery Key confirmed
never transmitted/stored unwrapped, `getRecoveryEnvelope` confirmed to
return nothing beyond the one ciphertext field, the two-factor requirement
confirmed to actually hold — neither the email link nor the Recovery Key
alone completes recovery, the post-recovery Recovery Key confirmed to
replace the old one server-side, clipboard auto-clear confirmed to never
log clipboard contents, the inactivity timer's DOM listeners confirmed
fully removed on lock/unmount) was performed this session — no issues
found. **Not yet done:** a manual browser click-through of the full
sign-up → Emergency Kit → sign-out → recover → new password flow, and the
idle-timeout/tab-hidden auto-lock behavior (same no-automation caveat as
every prior phase).

Phase 8w (UX polish, web) is complete. A codebase audit found the app
functionally solid but rough in four concrete areas, closed this phase
without turning into an open-ended redesign.

**Settings screen** (the main gap Phase 7w's "hardcoded defaults" note
flagged): `packages/validation/src/userProfile.ts` adds
`userProfileSettingsSchema` (Zod), matching the existing "never trust data
structurally" precedent every other Firestore read already follows.
`VaultProvider.tsx` gains `settings: UserProfileSettings | undefined` state
(populated from `signUp`'s literal write, and from `signIn`/`unlock`'s
`fetchUserProfileDocument` call, Zod-validated via `parseSettings`) and
`updateSettings(patch)` (merges into current settings, writes via the
existing `updateUserProfileDocument`'s `{merge: true}` — no
`packages/firebase` changes needed). The auto-lock effect's hardcoded
`AUTO_LOCK_TIMEOUT_MS` is replaced with
`(settings?.autoLockMinutes ?? 5) * 60_000`. `apps/web/src/app/settings/page.tsx`
(new) is `UNLOCKED`-gated like every other authenticated page, with
selects for auto-lock minutes and clipboard-clear seconds and a
`BooleanField` for `biometricUnlockEnabled` (persisted, still inert — no
consumer exists yet, same documented limitation as at sign-up).
`clipboardClearSeconds` is threaded all the way to every Copy button:
`SecretField`/`CustomFieldsEditor`/`ItemForm` each gained the optional prop,
and `PasswordGeneratorPanel`'s `handleCopy` switched from a raw
`navigator.clipboard.writeText` to `copyWithAutoClear` too (closing a real
inconsistency found this session — its Copy button never cleared the
clipboard at all, unlike `SecretField`'s).

**Accessibility**: `SecretField.tsx` now associates its label with its
input via `useId()` (was a bare sibling `<span>`), adds `aria-pressed` to
the Reveal/Hide toggle, and a visually-hidden `aria-live="polite"` region
announcing "Copied". `TagsInput.tsx` got the same label/input association
fix. `CustomFieldsEditor.tsx`'s per-row Label input and type `<select>`
gained `aria-label`s (previously bare, no accessible name beyond an
unreliable placeholder).

**Error/loading-state gaps**: no new shared component — every page already
follows one consistent inline pattern
(`<p role="alert" className="text-sm text-red-600">`), so three specific
silent-failure gaps were closed directly instead: `useVaultItems.ts` gains
a `loadError: string | null` field, set when the Firestore listener's
`onError` fires (previously only logged and silently swallowed), cleared on
the next successful update — surfaced on Vault Home.
`PasswordGeneratorPanel.tsx` now surfaces a message when `regenerate()`
no-ops because every character set is disabled, and when the Copy button's
clipboard write fails. `conflicts/page.tsx` now surfaces
`resolveConflict` failures with the same inline pattern its sibling pages
use.

**Responsive layout**: targeted fixes to the four densest rows found —
Vault Home's header (`flex-col sm:flex-row`), the item-type picker grid
(`grid-cols-1 sm:grid-cols-2 md:grid-cols-3`), Item Detail's action-button
row, and `PasswordGeneratorPanel`'s button row (all gained `flex-wrap`).

**Focus management** (light touch): `autoFocus` added to the first input on
`sign-in`, `sign-up`, `recover`, and `recover/confirm` (matching `unlock`,
the only page that already had it). General route-change focus management
and a shared `LoadingState`/`ErrorBanner` component are explicitly deferred
— no duplication problem serious enough yet to warrant the abstraction.

The `CLAUDE.md` §4 step 6 security review pass (confirmed `updateSettings`
never writes anything beyond the `settings` sub-object — a `{merge: true}`
write, and the Firestore rule requiring the resulting doc retain its `uid`
field still holds since `uid` is set once at creation and untouched by the
merge; confirmed no settings value can weaken the fail-closed unlock path,
since `unlock()`'s AEAD decrypt is unconditional and both numeric settings
are Zod-validated as positive integers; confirmed clipboard
clear-only-if-unchanged behavior is untouched by threading
`clipboardClearSeconds` through — it only changes the delay; confirmed
`/settings` is gated identically to every other authenticated route) was
performed this session — no issues found. **Not yet done:** a manual
browser click-through of the settings screen and a viewport resize
click-through of the four responsive-layout fixes (same no-automation
caveat as every prior phase).

Phase 8v (visual design system, web) is complete. `KRYVEX_UI_README.md`
(added this session) is the visual source of truth — colors, typography,
spacing/radius/shadow scale, component behavior, and the exact composition
of the first 3 onboarding screens. None of it had been applied before this
phase: `apps/web` was functionally complete through Phase 8w but still used
default Next.js/Tailwind starter styling. Scope was deliberately narrow —
apply the system to the 3 onboarding screens only, not a repo-wide
component migration, and web-only (`apps/mobile` stays deferred per the
Track A/Track B split above).

**Foundation**: `apps/web/src/app/globals.css` is rewritten with the full
Kryvex semantic token set as Tailwind v4 CSS variables (background/surface/
surface-2/card/text-primary-secondary-muted/border/border-strong/primary
(+hover/soft)/success/warning/error(destructive)/info), dark as the bare
`:root` default (the primary identity) with a `prefers-color-scheme: light`
override carrying the README's separate light palette — same token names in
both, so no component hard-codes a color. Tailwind's default 4px-based
spacing scale already matches the README's scale, so no custom spacing
config was needed; `--radius-sm/md/lg/xl` are remapped to the README's 4/12/
16/20px scale. `layout.tsx` swaps `Geist`/`Geist_Mono` for `Inter`/
`JetBrains Mono` and wires a single Sonner `<Toaster>`. New dependencies in
`apps/web/package.json`: `lucide-react`, `react-hook-form`,
`@hookform/resolvers`, `sonner`, `class-variance-authority`, `clsx`,
`tailwind-merge`, plus a direct `zod` dependency (was previously only
indirect via `@kryvex/validation`). No Radix/Base UI/full shadcn CLI
scaffold was pulled in — `apps/web/src/components/ui/` (`button`, `input`,
`label`, `card`, `progress`) is a small set of hand-written shadcn-style
primitives wired to the new tokens, deliberately avoiding an extra
`@radix-ui/react-slot` dependency the 3 screens don't need (no `asChild`
use case yet).

**New components**: `components/brand/` (`Logo`, an SVG geometric-K mark;
`FloatingVaultIllustration`, the Screen 1 decorative visual — no external
images). `components/auth/` (`AuthCard`, the shared centered-card shell used
by Screens 02/03; `PasswordInput`, a show/hide-toggle input; `passwordRequirements.ts`,
`PasswordStrengthMeter`, `PasswordRequirementsList` — all three requirement-
checking components derive from the same `evaluateMasterPassword()` helper
so the strength meter and checklist can never disagree with each other or
with `masterPasswordSchema`; `BiometricUnlockButton`, an honest "not
available yet" affordance — there is no biometric implementation (the
Settings screen's own toggle is a documented placeholder), so it surfaces a
Sonner toast instead of a fake unlock, per `CLAUDE.md`'s "never create fake
security indicators" rule).

**Screens**: `apps/web/src/app/welcome/page.tsx` (new) is Screen 01. Screens
02/03 (`sign-up/page.tsx`, `unlock/page.tsx`) are restyled in place —
`signUp()`/`unlock()`/`EmergencyKit` flow logic is unchanged, only the
visual layer and (for sign-up) the internal form-state mechanism moved from
manual `useState` to `react-hook-form` + `zodResolver(signUpFormSchema)`.
Sign-up deliberately stays one combined email + master-password screen
(matching the app's existing architecture) rather than being split into two
routes to literally match the Screen 02 mockup's password-only composition —
an explicit product decision, not an oversight.

**Master-password policy change**: `masterPasswordSchema`
(`packages/validation/src/auth.ts`) previously enforced only a 12-character
minimum (a Phase 2 decision explicitly deferring strength rules). The Screen
02 checklist requires 4 things (length, upper+lower case, number, special
character); rather than show checklist items the schema doesn't actually
enforce, `masterPasswordSchema` now enforces all 4 — an explicit,
deliberate decision (not a silent drift) to keep the visual checklist
honest. `auth.test.ts` gained cases for each new rule.

**`/welcome` navigation change**: `apps/web/src/app/page.tsx`'s `SIGNED_OUT`
redirect target changed from `/sign-in` to `/welcome` so Screen 01 is
reachable in the real flow — navigation-only, no change to `VaultProvider`,
`LockState`, or any auth/crypto logic. `CLAUDE.md` §4 step 6 security
review: no vault/plaintext exposure, no new attack surface, no change to
which state gates `/unlock` vs `/`; it only changes which page an
already-signed-out visitor lands on.

**Deferred / recommended next**: `packages/ui`'s existing `Button`/
`SecretField`/etc. (used by the item/generator/settings/recover screens)
are still on the old un-tokened styling — migrating them onto the same
token/shadcn foundation is a natural next pass, tracked as a follow-up, not
done here. `apps/mobile` gets the same treatment once Track A reaches Phase
10w, per the existing deferral.

Phase 8v2 (visual design system rollout, rest of web app) is complete.
Phase 8v (above) deliberately scoped the Kryvex visual system to 3
onboarding screens only; this phase extends it to everything else —
sign-in, Vault Home, Item Detail/Edit/New, Generator, Settings, Recovery
(request+confirm), Conflicts — plus the `packages/ui` components those
pages render through, since most of the actual UI surface lives there, not
in `apps/web` itself.

**Primitives consolidation**: the shadcn-style `Button`/`Input`/`Label`/
`Card`/`Progress` + `cn()` built in `apps/web/src/components/ui/` for Phase
8v moved into `packages/ui/src/components/ui/` (and `packages/ui/src/lib/
utils.ts`) as the single canonical foundation — `packages/ui` gained
`lucide-react`/`class-variance-authority`/`clsx`/`tailwind-merge` as direct
dependencies. The old flat `packages/ui/src/components/Button.tsx`
(`primary|secondary|danger` variants) is retired in favor of the new one
(`primary|secondary|ghost|destructive|link`); every internal consumer
(`AttachmentPreview`, `AttachmentUploadForm`, `EmergencyKit`, `ItemForm`,
`PasswordGeneratorPanel`) now imports from `./ui/button`. The 3 onboarding
screens and `apps/web/src/components/auth/*` now import `Button`/`Input`/
`Label`/`Card`/`Progress`/`cn` from `@kryvex/ui`; the `apps/web`-local
duplicate and `apps/web/src/lib/utils.ts` are deleted, and the now-unused
`class-variance-authority`/`clsx`/`tailwind-merge` direct deps were dropped
from `apps/web/package.json` (still available transitively via
`@kryvex/ui`). `CardTitle` gained an `as` prop (default `h3`) since a `Card`
is now used many-per-page (item tiles, `ItemCard`) — `AuthCard` explicitly
passes `as="h1"` since it's still each auth screen's one true heading.

**Rest of `packages/ui` restyled**, same props/behavior: `TextField`/
`MultilineField` now built on the new `Input`/`Textarea`/`Label`;
`BooleanField` is a token-styled native checkbox; `SecretField` matches
`PasswordInput`'s show/hide treatment (`Eye`/`EyeOff`) plus a `Copy`/`Check`
button, keeping its `aria-live` "Copied" announcement and exact `Reveal`/
`Hide`/`Copy` accessible names (existing test contract); `TagsInput` chips
are token-styled with an `X` remove icon; `CustomFieldsEditor`/`ItemForm`/
`AttachmentUploadForm` restyled in place (`ItemForm` deliberately keeps its
own `useState` form, not migrated to `react-hook-form` — bigger behavior-
risk change, out of scope here); `ItemTypeBadge` gained a per-type Lucide
icon via a new exported `getItemTypeIcon()` lookup (also used by `apps/web`'s
`ItemCard`/type-picker tiles); `PasswordGeneratorPanel`/`EmergencyKit`
restyled (`EmergencyKit`'s recovery-key block is now a `Card`). New shared
primitives added to `packages/ui/src/components/ui/`: `badge`, `alert`,
`skeleton`, `search-input`, `select` (a token-styled **native** `<select>`,
not a custom listbox — nothing here needs multi-select), `dialog` and
`sheet` (both hand-rolled — Escape/backdrop-close, `dialog` has a Tab focus
trap — no Radix dependency added), `empty-state`, `textarea`.

**Navigation shell**: `page.tsx`, `item/**`, `generator/`, `settings/`,
`conflicts/` moved into a `(vault)/` Next.js route group (URLs unchanged);
`welcome`/`sign-in`/`sign-up`/`unlock`/`recover(+confirm)` stay top-level —
no persistent nav on those. New `(vault)/layout.tsx` renders
`components/layout/Sidebar.tsx` (desktop) + `MobileTopBar.tsx` (mobile,
opens a `Sheet` reusing the same `SidebarNav`) and is now the **single**
place the `SIGNED_OUT`→`/welcome`/`AUTHENTICATED_LOCKED`→`/unlock` redirect
gate lives, replacing ~7 duplicated copies (Home, Item Detail/Edit/New,
Generator, Settings, Conflicts) — each of those pages' own redirect tests
were removed in favor of one `(vault)/layout.test.tsx`. Sidebar categories
(Logins/Secure Notes/Cards/Identities/API Keys/Recovery Codes/Files) filter
Vault Home via a `?type=` search param, resolved client-side in `page.tsx`
(no `packages/vault` changes). **"Recently Used" was explicitly dropped**
from the sidebar (present in the original design ask) — investigation
found `VaultItemDocument.updatedAt`/`createdAt` are deliberately typed
`unknown` (Firestore Timestamp serialization was never finalized, see
Phase 1/2 decisions), nothing in the app reads or sorts by them today, and
no normalization helper exists — building a sort on top of an `unknown`
value would be exactly the kind of shaky-foundation feature this pass was
scoped to avoid. Flagged as a real follow-up: add a safe timestamp-
normalization helper to `packages/vault` first, then reintroduce it.

**Vault Home**: old inline button row (Generator/Settings/+Add/Lock/Sign
out) removed — Settings, Generator, Lock Vault, and Sign out moved to the
sidebar's bottom section (Generator and Sign out aren't in the README's
suggested sidebar list but have no other home, so they were added rather
than silently dropping existing functionality); top row is now
`SearchInput` + primary `+ Add`. Items render via new `components/vault/
ItemCard.tsx` (per-type icon, `Star`/`StarOff` favorite toggle) instead of
a raw `<li>`; empty/no-results states use `EmptyState`; conflict/load-error
banners use `Alert`; loading state uses `Skeleton` rows.

**Item Detail/Edit/New**: Detail's tags render as `Badge`s; footer actions
use the new `Button` variants. **Behavior change**: Delete now opens a real
`Dialog` ("Delete this item?" / Cancel / Delete) instead of firing
`window.confirm` — matches `KRYVEX_UI_README.md` §13's "never make
destructive actions visually dominant unless confirmation is required" and
§17 listing `ConfirmDialog` as a core component; new tests cover both the
cancel and confirm paths. New's type-picker grid is now `Card` tiles with
the same per-type icon as `ItemTypeBadge`.

**Sign-in, Generator, Settings, Recovery, Conflicts**: sign-in and both
recovery screens now use the same `AuthCard`/`PasswordInput` pattern as
sign-up/unlock; Settings' two dropdowns became the new `Select`; Conflicts'
two-version comparison is now a `Card` per conflict with an `AlertTriangle`
marker and restyled action buttons.

**A real bug found and fixed during verification**: browser-testing this
phase against a live Firebase emulator (sign up → add an item → item
detail → delete-confirm → sidebar filter → settings → mobile drawer, via
Playwright) surfaced visually broken buttons — "Add", "Edit", "Back to
vault" all rendered as ~27px-wide unstyled links instead of proper
buttons. Root cause: `packages/ui` is a pnpm workspace package resolved
through a `node_modules` symlink, and Tailwind v4's automatic source
detection doesn't reliably scan through that symlink — so utility classes
used *only* inside `packages/ui`'s `.tsx` files (never coincidentally
duplicated in an already-scanned `apps/web` file) silently generated no
CSS. Fixed with one line in `apps/web/src/app/globals.css`:
`@source "../../../../packages/ui/src";` — re-verified via the same
Playwright walkthrough that every affected button now renders correctly.
This is a real monorepo gotcha worth remembering: any *new* Tailwind-v4
workspace package consumed the same way will need the same `@source` line,
or its classes will silently vanish exactly like this.

**Deferred / recommended next**: `apps/mobile` still waits for Track A to
reach Phase 10w, per the existing split. `KRYVEX_UI_README.md` §17 lists
several components (CommandPalette, DataTable, Tooltip, Popover, Dropdown,
Tabs, Accordion, Avatar, Breadcrumb, AutoLockIndicator, VaultStatus,
RecoveryCodeGrid, TOTPDisplay, ...) that no current page needs — none were
built, since doing so would mean inventing UI for features that don't
exist yet (e.g. `TOTPDisplay` needs real TOTP code generation, which isn't
implemented anywhere). "Recently Used" (see above) is the one concrete,
scoped follow-up.

Phase 9w (security hardening, web + shared packages) is complete. Three
parallel research passes — the documented threat model/Firebase rules/
crypto architecture plus existing test coverage, the actual `apps/web`
XSS/logging/localStorage/CSRF/dependency surface, and the actual
`packages/crypto`/`packages/vault`/`packages/password-generator`
implementations against best practice — found the security posture
fundamentally solid: no XSS sinks anywhere, no weak hashes, no
`Math.random()` in any crypto path, correct fail-closed AEAD throughout,
no secrets in logs/URLs/`localStorage`. This phase closed the small number
of real, mostly self-flagged gaps that review surfaced — see §12's
decisions log for each one's full reasoning:

- **Firebase App Check** wired on `apps/web` (reCAPTCHA v3 in production,
  emulator debug-token mode in dev), but deliberately **not enforced** on
  any Cloud Function yet — `apps/mobile` has no App Check wiring, and
  enforcing now would lock mobile out. Also corrected
  `docs/FIREBASE_SECURITY.md` §4, which previously and incorrectly claimed
  App Check was already "enabled."
- **`firestore.rules`** gained `isValidKdfParams`, flooring a profile's
  Argon2id parameters at the shipped defaults on create/update — previously
  unvalidated entirely. 6 new emulator test cases in
  `tests/security/firestore.rules.test.ts` (37 total, up from 31). Also
  directly cross-checked `packages/types`' `ITEM_TYPES`/`VaultItemDocument`/
  `AttachmentDocument` shapes against `isValidItem`/`isValidAttachment`'s
  hand-synced lists — confirmed no drift.
- **Best-effort key-buffer wiping** (`wipeBytes`, new in `packages/crypto`)
  for `masterKey`/`authKeyBytes` and, in the shared `lockStateReducer`
  itself (not each app's `lock()` wrapper, to avoid a stale-closure bug),
  `stretchedMasterKey`/`vaultEncryptionKey` on lock. Shared with
  `apps/mobile` for free since the reducer is a shared package.
- **Per-item DEK reuse across edits** re-reviewed and confirmed safe
  (nonce freshness, not key reuse, is what AES-256-GCM actually depends
  on) — resolved the code's own "flagged for security review" comment
  rather than leaving it open.
- **KDF-param upgrade path** (rehash-on-unlock if policy strengthens)
  explicitly deferred as a documented follow-up — real feature work, not
  in scope for a review pass.
- Five non-cryptographic `Math.random()` ID-generation fallbacks replaced
  with a CSPRNG-backed fallback in `apps/web`/`packages/ui` (not
  exploitable, but a literal violation of CLAUDE.md's absolute wording);
  `apps/mobile`'s two mirrors left as-is per the Track A/B split.
- `react/no-danger` added to the shared ESLint config (nothing uses
  `dangerouslySetInnerHTML` today — locks that in defensively).
  `secureLogger`'s doc comment now explicitly states the one real gap its
  redaction has (the `message` string itself is never scanned, only object
  keys in `meta`) as a hard rule for callers, since no current call site
  was exploiting it but the gap itself was undocumented before.
- `pnpm audit --prod`: 4 advisories found (2 high, 2 moderate), all
  transitive dependencies of `apps/mobile`'s React Native/Expo toolchain
  (`image-size` via `metro`, `uuid` via `xcode`, `decode-uri-component` via
  `expo-router`), all denial-of-service-class issues in build/dev tooling —
  zero findings in `apps/web`/`packages/*`. No dependency changes made;
  tracked for whenever mobile hardening (Phase 9m) happens.
- Not done, flagged as a manual action item (not something code can
  safely do): enabling Firebase Auth's **Email Enumeration Protection**
  project setting — an Identity Platform setting with possible cost/
  behavior implications the project owner should decide on. See
  `docs/DEPLOYMENT.md`'s release checklist.

Phase 10w (release, web) is the next scheduled step — see `PLAN.md`.
