# Kryvex — Source of Truth

Status: **Phase 0 — Architecture complete, no application code written yet.**
This is the primary project reference. Read this before any other file when
picking up work on Kryvex. Detailed reasoning for each section lives in the
linked `docs/*.md` file — this document summarizes and cross-references rather
than duplicating.

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
decryption (`AUTHENTICATED_LOCKED` is a valid, expected state). Detail:
[docs/CRYPTOGRAPHIC_ARCHITECTURE.md](./docs/CRYPTOGRAPHIC_ARCHITECTURE.md) §4.

## 11. Device unlock

Biometric unlock (Face ID / Touch ID / Android Biometric Prompt) gates access
to a locally Keychain/Keystore-protected key, never to the master password or
raw biometric data: [docs/CRYPTOGRAPHIC_ARCHITECTURE.md](./docs/CRYPTOGRAPHIC_ARCHITECTURE.md) §7,
build spec §18.

## 12. Security decisions log

| Decision                                                                        | Rationale                                                                   | Reference                        |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------- |
| Envelope encryption (per-item/attachment DEKs, not direct Vault-Key encryption) | Cheap key rotation; future sharing without re-encrypting content            | CRYPTOGRAPHIC_ARCHITECTURE.md §2 |
| Titles/tags encrypted, not left plaintext                                       | Metadata itself can be sensitive                                            | CRYPTOGRAPHIC_ARCHITECTURE.md §5 |
| `favorite` flag left plaintext                                                  | Low-sensitivity sorting convenience; explicitly flagged exception           | DATA_MODEL.md §5                 |
| Attachment `mimeType`/`sizeBytes` left plaintext                                | Needed for non-decrypting UI/quota; low sensitivity                         | DATA_MODEL.md §5                 |
| Hard deletes disallowed client-side; tombstones only                            | Enables correct offline conflict/delete semantics                           | SYNC_ENGINE.md §5                |
| Recovery via user-held Recovery Key, no server escrow                           | Preserves zero-knowledge guarantee; explicit unrecoverable-if-lost tradeoff | RECOVERY.md §1                   |
| Firebase Auth value ≠ master password (HKDF-derived)                            | Compromised Firebase credential must not reveal master password             | CRYPTOGRAPHIC_ARCHITECTURE.md §4 |

## 13. Known limitations

Kryvex cannot protect against: a fully compromised device while unlocked,
OS-level keyloggers, a weak user-chosen master password, loss of both master
password and recovery kit, physical coercion, or compromise of the platform's
own secure-storage hardware/TEE. Full list:
[docs/SECURITY_THREAT_MODEL.md](./docs/SECURITY_THREAT_MODEL.md) §5.
No marketing or UI copy may claim "unhackable"/"military-grade"/similar.

## 14. Development commands

Not yet real — Phase 1 scaffolding pending. Planned command surface and
confirmed local tooling versions: [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md).

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

No application code, monorepo scaffolding, or Firebase project exists yet.
Phase 1 (Foundation — monorepo, web/mobile scaffolds, shared packages,
lint/test/CI, Firebase emulator) is the next step, pending sign-off on this
architecture.
