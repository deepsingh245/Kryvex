# Kryvex — Data Model

Status: Phase 4 — `VaultItemDocument`/`ItemContent` below are implemented in
`packages/types`, `packages/validation`, and `packages/vault`'s
`itemCrypto.ts` (wrap/encrypt/decrypt), with direct Firestore CRUD via
`packages/firebase/src/vaultItems.ts` and a real UI in `apps/web`.
`AttachmentDocument` (§3) remains design-only until Phase 6 — item types
`image`/`pdf`/`file` are modeled in the type system but excluded from the
Add-item flow until then. See also:
[CRYPTOGRAPHIC_ARCHITECTURE.md](./CRYPTOGRAPHIC_ARCHITECTURE.md),
[FIREBASE_SECURITY.md](./FIREBASE_SECURITY.md), [SYNC_ENGINE.md](./SYNC_ENGINE.md).

## 1. Envelope: what actually lives in Firestore

Every vault item is stored as one Firestore document with a plaintext
"envelope" shell and an opaque encrypted payload. The server only ever reads
the envelope fields; it never parses `encryptedData`.

```ts
// packages/types — VaultItemDocument
interface VaultItemDocument {
  id: string; // client-generated UUID, immutable
  ownerId: string; // Firebase Auth uid, enforced by security rules
  type: ItemType; // enum: needed for iconography/sorting without decryption
  revision: number; // monotonic, incremented on every write (see SYNC_ENGINE.md)
  updatedAt: Timestamp;
  createdAt: Timestamp;
  deleted: boolean; // tombstone flag; document retained, not hard-deleted, until GC
  favorite: boolean; // plaintext by design: sorting/filtering convenience,
  // considered low-sensitivity (see note below)
  wrappedItemKey: EncryptedEnvelope; // this item's Data Encryption Key,
  // wrapped by the Vault Encryption Key
  encryptedData: EncryptedEnvelope; // AES-256-GCM ciphertext of ItemContent (below),
  // encrypted under this item's unwrapped DEK
  attachmentRefs: string[]; // attachment document IDs belonging to this item (may be empty)
}

type ItemType =
  | "login"
  | "secureNote"
  | "identity"
  | "card"
  | "pin"
  | "apiKey"
  | "recoveryCodes"
  | "image"
  | "pdf"
  | "file"
  | "custom";

interface EncryptedEnvelope {
  v: 1;
  alg: "AES-256-GCM";
  nonce: string; // base64
  ciphertext: string; // base64
}
```

`favorite` is left in the clear as a pragmatic, low-sensitivity exception (it
enables sorting/filtering without decrypting the whole vault just to render the
favorites list) — flagged here explicitly per the build spec's rule that every
metadata-exposure decision must be documented and deliberate. Titles and tags
are **not** exempted (see CRYPTOGRAPHIC_ARCHITECTURE.md §5) and live inside the
encrypted `ItemContent`, not the envelope.

## 2. `ItemContent` — the decrypted payload shape, per type

`ItemContent` is never stored in plaintext; this is the shape produced only
after successful client-side decryption. All variants share a common base:

```ts
interface ItemContentBase {
  title: string;
  tags: string[];
  notes?: string;
  customFields: CustomField[];
}

interface CustomField {
  id: string;
  label: string;
  type:
    | "text"
    | "secret"
    | "url"
    | "email"
    | "number"
    | "date"
    | "multiline"
    | "boolean"
    | "totp";
  value: string; // booleans serialize as "true"/"false"; totp holds the raw secret
}
```

### Login

```ts
interface LoginContent extends ItemContentBase {
  type: "login";
  username: string;
  password: string;
  websites: string[]; // supports multiple URLs for autofill matching (see AUTOFILL_ARCHITECTURE.md)
  totp?: { secret: string; issuer?: string; account?: string }; // v1.5, schema reserved now
}
```

### Secure Note

```ts
interface SecureNoteContent extends ItemContentBase {
  type: "secureNote";
  body: string;
}
```

### Identity

```ts
interface IdentityContent extends ItemContentBase {
  type: "identity";
  fullName?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  address?: Address;
  idNumbers?: CustomField[]; // passport/SSN/etc modeled as typed custom fields
}

// Added Phase 4 — referenced above but not originally defined in this doc.
interface Address {
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}
```

Phase 4's Add/Edit UI does not yet expose `address`/`idNumbers` editing (kept
out of the generic `ItemForm`'s MVP scope — both are optional, and
title/tags/notes/customFields already give a way to capture equivalent
information without a bespoke nested editor); revisit if needed.

### Card

```ts
interface CardContent extends ItemContentBase {
  type: "card";
  cardholderName: string;
  number: string; // full PAN — encrypted at rest like everything else;
  // UI never logs/displays it unmasked outside an explicit reveal action
  expiry: string; // MM/YY
  cvv: string;
  pin?: string;
  brand?: string;
}
```

### PIN

```ts
interface PinContent extends ItemContentBase {
  type: "pin";
  value: string;
}
```

### API Key / Token

```ts
interface ApiKeyContent extends ItemContentBase {
  type: "apiKey";
  service: string;
  key: string;
  token?: string;
  endpoint?: string;
}
```

### Recovery Codes

```ts
interface RecoveryCodesContent extends ItemContentBase {
  type: "recoveryCodes";
  service: string;
  codes: { code: string; used: boolean }[];
}
```

### Image / PDF / File

```ts
interface AttachmentItemContent extends ItemContentBase {
  type: "image" | "pdf" | "file";
  attachmentId: string; // references AttachmentDocument
}
```

### Custom

```ts
interface CustomItemContent extends ItemContentBase {
  type: "custom";
  // fully composed from customFields — no type-specific fixed fields
}
```

## 3. Attachments

```ts
interface AttachmentDocument {
  id: string;
  ownerId: string;
  itemId: string; // owning item
  revision: number;
  updatedAt: Timestamp;
  deleted: boolean;
  wrappedAttachmentKey: EncryptedEnvelope; // this attachment's DEK, wrapped by Vault Encryption Key
  mimeType: string; // plaintext: needed to render a preview UI without decrypting first
  sizeBytes: number; // plaintext: needed for quota/UX, non-sensitive
  storagePath: string; // Firebase Storage path to the encrypted blob
  encryptedFileName?: EncryptedEnvelope; // filename itself may be sensitive; encrypted
}
```

The blob at `storagePath` in Firebase Storage is the raw AES-256-GCM ciphertext
of the file content (encrypted client-side before upload — see build spec
§13). `mimeType`/`sizeBytes` are left in the clear as a pragmatic exception
(needed for UI rendering/quota without a decrypt round-trip); actual filenames
and content are not.

## 4. Non-secret account/profile document

```ts
interface UserProfileDocument {
  uid: string;
  email: string; // from Firebase Auth
  kdfSalt: string; // hex-encoded, Argon2id salt
  kdfParams: {
    memoryKiB: number;
    iterations: number;
    parallelism: number;
    version: number;
  };
  protectedVaultKey?: EncryptedEnvelope; // Vault Encryption Key wrapped by Stretched Master Key
  protectedVaultKeyByRecovery?: EncryptedEnvelope; // wrapped by Recovery Key, if set up
  createdAt: Timestamp;
  settings: {
    autoLockMinutes: number;
    clipboardClearSeconds: number;
    biometricUnlockEnabled: boolean;
  };
}
```

**`protectedVaultKey` is optional** (added Phase 2, implementing this
document for the first time): the profile document is created at signup
(Phase 2) with `uid`/`email`/`kdfSalt`/`kdfParams`/`createdAt`/`settings`
only — there's no Vault Encryption Key to wrap yet, since AES-256-GCM/key
wrapping don't exist until Phase 3. The document is **updated, not
recreated**, once Phase 3 adds `protectedVaultKey`. This is already legal
against the deployed `firebase/firestore.rules` — the `users/{uid}` rule has
no `hasAll` field-completeness check (unlike the `items` subcollection's
`isValidItem()`), so no rules change was needed.

## 5. Field-level rationale summary

| Field class                                          | Encrypted?                                       | Rationale                                                                |
| ---------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| id, ownerId, type, revision, timestamps, tombstone   | No                                               | Required structurally for sync/authorization; does not disclose content. |
| favorite                                             | No                                               | Low-sensitivity UX convenience, explicitly accepted exception.           |
| title, tags, notes, all secret values, custom fields | Yes                                              | May directly disclose sensitive information.                             |
| attachment mimeType/sizeBytes                        | No                                               | Needed for non-decrypting UI/quota logic; low sensitivity.               |
| attachment filename, file content                    | Yes                                              | May disclose sensitive information (e.g. "passport_scan.pdf").           |
| kdfSalt, kdfParams, wrapped keys                     | No (but meaningless without the master password) | Required for the client to re-derive/unwrap keys on any device.          |

## 6. Search (Phase 4 decision)

`PLAN.md` §5 previously flagged "local search index approach for large
vaults without server-side plaintext" as an open Phase 0 risk. Resolved for
Phase 4: `@kryvex/vault`'s `selectVisibleItems` does an in-memory,
case-insensitive substring match over already-decrypted `title`/`tags`/
`notes` — no persisted index. This is sufficient because Phase 4 has no
offline persistence yet (Phase 5), and the full item set must already be
decrypted into memory to render the vault list at all, so a substring scan
over data already resident in memory is free. Revisit only if real usage at
scale shows this too slow/imprecise once Phase 5's offline cache exists to
host a real index.
