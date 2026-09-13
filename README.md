# Kryvex

A zero-knowledge encrypted personal vault for passwords, credentials,
secrets, notes, identity/card data, recovery codes, API keys, images, PDFs,
and files — syncing across web and mobile.

**Core constraint:** the server never needs access to plaintext vault
contents. Every architectural decision is filtered through that first.

**Core experience:** Unlock → Find → Reveal/Copy/Use.

## Status

**Web is the current focus, being taken to full completion before mobile
work resumes.** See [`PLAN.md`](./PLAN.md) for the full phase roadmap (now
split into a Web-completion track and a deferred Mobile-completion track)
and [`KRYVEX_SOURCE_OF_TRUTH.md`](./KRYVEX_SOURCE_OF_TRUTH.md) for exactly
what's implemented today.

| Area                                                          | Status                           |
| ------------------------------------------------------------- | -------------------------------- |
| Auth (Firebase Auth, lock state)                              | Done                             |
| Cryptographic core (AES-256-GCM, Argon2id/HKDF key hierarchy) | Done                             |
| Vault item CRUD (all 11 item types)                           | Done — web + mobile              |
| Sync (offline-first, conflicts, tombstones)                   | Done — web + mobile              |
| Attachments (encrypted files, Storage)                        | Done — web; mobile port deferred |
| Recovery Key / Emergency Kit                                  | Done — web                       |
| Session security (auto-lock, clipboard clear)                 | Done — web                       |
| Biometric unlock / secure key storage                         | Mobile-only, deferred            |
| UX polish, settings screen                                    | Next up (web)                    |
| Release (production deploy)                                   | Not started                      |

## Tech stack

pnpm workspaces + Turborepo monorepo:

- `apps/web` — Next.js 16
- `apps/mobile` — Expo SDK 57 / React Native
- `packages/*` — shared crypto, vault logic, sync engine, Firebase glue,
  types, validation, password generator, storage interfaces, security
  utilities, and UI components
- `firebase/` — Firestore/Storage security rules, Cloud Functions
- Firebase (Auth, Firestore, Storage, Cloud Functions) as the backend —
  never a decryption path

Encryption: AES-256-GCM (content + key wrapping), Argon2id (password KDF),
HKDF-SHA-256 (key stretching). Envelope encryption throughout — every item
and attachment gets its own Data Encryption Key, wrapped by the Vault
Encryption Key.

## Getting started

```bash
corepack enable        # if pnpm isn't already available
pnpm install
cp .env.example .env.local   # fill in Firebase config per docs/DEVELOPMENT.md §5

firebase emulators:start --only auth,firestore,storage,functions   # terminal 1
pnpm --filter @kryvex/web dev                                       # terminal 2
```

Then open `http://localhost:3000`.

```bash
pnpm lint          # eslint + prettier --check across the monorepo
pnpm typecheck     # tsc --noEmit across all packages/apps
pnpm test          # unit tests (Vitest + Jest)
pnpm test:security # Firestore/Storage rules tests against the emulator
pnpm build         # build all apps/packages
```

Full setup detail, environment variables, and known tooling quirks:
[`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md).

## Documentation map

Read in this order when picking up work on this project:

1. [`CLAUDE.md`](./CLAUDE.md) — workflow rules for contributors/agents working in this repo
2. [`KRYVEX_SOURCE_OF_TRUTH.md`](./KRYVEX_SOURCE_OF_TRUTH.md) — primary reference: architecture, data model, key hierarchy, current status, decisions log
3. [`PLAN.md`](./PLAN.md) — phase roadmap and in-flight work
4. `docs/*.md` — deep-dive design docs per area:
   - [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system overview
   - [`CRYPTOGRAPHIC_ARCHITECTURE.md`](./docs/CRYPTOGRAPHIC_ARCHITECTURE.md) — key hierarchy, algorithms, rotation
   - [`DATA_MODEL.md`](./docs/DATA_MODEL.md) — item types, custom fields, attachments
   - [`FIREBASE_SECURITY.md`](./docs/FIREBASE_SECURITY.md) — Firestore/Storage rules, App Check
   - [`SYNC_ENGINE.md`](./docs/SYNC_ENGINE.md) — IDs, revisions, tombstones, conflict resolution
   - [`SECURITY_THREAT_MODEL.md`](./docs/SECURITY_THREAT_MODEL.md) — threats in/out of scope
   - [`RECOVERY.md`](./docs/RECOVERY.md) — Recovery Key / account recovery flow
   - [`AUTOFILL_ARCHITECTURE.md`](./docs/AUTOFILL_ARCHITECTURE.md) — future autofill design
   - [`DEVELOPMENT.md`](./docs/DEVELOPMENT.md) — local setup, tooling, gotchas
   - [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — release process

## Non-negotiable constraint

> The server must never need access to plaintext vault contents.

No feature, optimization, or convenience ships if it requires Firestore,
Storage, or a Cloud Function to see, log, or process decrypted vault data.
