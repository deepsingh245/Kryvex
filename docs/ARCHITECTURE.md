# Kryvex — Architecture Overview

Status: Phase 0 draft. This document ties together the other Phase 0 docs; it
does not re-derive their detail. See:
[SECURITY_THREAT_MODEL.md](./SECURITY_THREAT_MODEL.md) ·
[CRYPTOGRAPHIC_ARCHITECTURE.md](./CRYPTOGRAPHIC_ARCHITECTURE.md) ·
[DATA_MODEL.md](./DATA_MODEL.md) ·
[FIREBASE_SECURITY.md](./FIREBASE_SECURITY.md) ·
[SYNC_ENGINE.md](./SYNC_ENGINE.md) ·
[AUTOFILL_ARCHITECTURE.md](./AUTOFILL_ARCHITECTURE.md) ·
[RECOVERY.md](./RECOVERY.md)

## 1. System diagram

```
┌────────────────────┐        ┌────────────────────┐
│   apps/web          │        │   apps/mobile       │
│   (Next.js)          │        │   (Expo/RN)          │
└─────────┬────────────┘        └─────────┬────────────┘
          │  both consume the same shared packages:
          │  packages/{crypto,vault,sync,firebase,types,
          │            validation,password-generator,storage,security,ui}
          ▼
┌──────────────────────────────────────────────────────┐
│  Client-side vault engine (runs on-device)             │
│  - unlock/lock state machine                            │
│  - key hierarchy (Argon2id → Vault Encryption Key)       │
│  - item CRUD, encrypt-before-write / decrypt-after-read  │
│  - local encrypted cache (offline-first)                 │
│  - sync engine (revision-based compare-and-swap)          │
└─────────────────────────┬────────────────────────────┘
                           │ ciphertext + non-secret metadata only
                           ▼
┌──────────────────────────────────────────────────────┐
│  Firebase                                               │
│  - Auth: identity only, never vault decryption            │
│  - Firestore: users/{uid}/{items,attachments}, profile doc │
│  - Storage: encrypted attachment blobs                     │
│  - Cloud Functions: account deletion, tombstone GC only     │
│  - Security rules: ownership-enforced, default-deny         │
└──────────────────────────────────────────────────────┘
```

The server-side box never contains a decryption capability. This is the
architectural invariant everything else is checked against (see build spec
§8, §63).

## 2. Client state machine

Two states are tracked and kept explicitly separate, per
CRYPTOGRAPHIC_ARCHITECTURE.md §4:

```
SIGNED_OUT
   │ Firebase sign-in
   ▼
AUTHENTICATED_LOCKED   ←──────────┐
   │ master password / biometric   │ auto-lock timeout,
   │ unlock succeeds                │ explicit lock, backgrounding,
   ▼                                │ session expiry
UNLOCKED ───────────────────────────┘
```

`AUTHENTICATED_LOCKED` is a first-class, expected state, not an error
condition — a user can be fully signed in to Firebase with a locked vault.
Implementation uses an explicit state machine (not scattered booleans like
`isLoggedIn`/`isUnlocked`), per build spec §61.

## 3. Data flow (create → sync → read on another device)

```
Create (device A)
  → validate input (Zod)
  → encrypt (per-item DEK, wrapped by Vault Encryption Key)
  → persist to local encrypted cache
  → sync engine writes envelope to Firestore (compare-and-swap on revision)
  → Firestore
  → device B's listener receives the envelope
  → device B validates envelope schema (never trusts it structurally)
  → device B decrypts locally (its own copy of the unwrapped Vault Encryption Key,
    derived from the same master password)
  → display
```

Edit/delete/restore/conflict/offline/reconnect/logout/lock/account-deletion
flows are detailed in SYNC_ENGINE.md and CRYPTOGRAPHIC_ARCHITECTURE.md §9 —
this section is the index, not a duplicate.

## 4. Monorepo structure

```
kryvex/
├── apps/
│   ├── web/        # Next.js + TypeScript
│   └── mobile/     # Expo/React Native + TypeScript
├── packages/
│   ├── crypto/               # KDF, AEAD, key wrapping — platform-specific impls behind one interface
│   ├── vault/                # item CRUD, lock state machine, business logic
│   ├── sync/                 # revision/tombstone/conflict engine
│   ├── firebase/             # Firestore/Storage/Auth client wrappers
│   ├── types/                # shared TS types (VaultItemDocument, ItemContent, etc.)
│   ├── validation/           # Zod schemas for every boundary
│   ├── password-generator/   # CSPRNG-based generator
│   ├── storage/              # local encrypted cache abstraction (IndexedDB / SecureStore)
│   ├── security/             # secureLogger, clipboard-clear, auto-lock timers
│   └── ui/                   # shared design primitives where web/mobile can share
├── firebase/
│   ├── firestore.rules
│   ├── storage.rules
│   └── functions/
├── docs/
├── tests/
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

`packages/crypto` and `packages/storage` expose one platform-agnostic
interface with separate web/native implementations underneath (Web Crypto API
vs. native modules), so `packages/vault` and application code never branch on
platform for security-sensitive operations.

## 5. Information architecture (screens)

```
Onboarding → Create Master Password → Confirm → Recovery Kit → Biometric opt-in → Done
                                                                      │
                                                                      ▼
                                          Vault Home (search, favorites, categories, + Add)
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
                  Item Detail             Add/Edit Item            Generator
                  (reveal/copy/           (type picker →           (length, charset
                   edit/delete/            structured or           toggles, copy)
                   favorite/tags)          custom fields)

Settings: auto-lock, clipboard timeout, biometric unlock, devices, export, account deletion
```

Full screen-level detail (copy, layout ASCII) lives in the build spec §22–§27;
this doc references it rather than duplicating it, per build spec §73's
instruction not to repeatedly re-derive answered questions.

## 6. Why this shape

Every cross-cutting decision here traces back to one constraint
(SECURITY_THREAT_MODEL.md §2): the server never needs plaintext. The
monorepo/package boundaries exist specifically so that boundary is enforced by
_structure_ (only `packages/crypto`/`packages/vault` touch key material; only
`packages/firebase` touches the network) rather than by convention alone.
