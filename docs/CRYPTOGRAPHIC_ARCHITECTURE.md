# Kryvex — Cryptographic Architecture

Status: Phase 3 implemented (AES-256-GCM content/key-wrapping encryption and
Argon2id/HKDF key derivation are real, in `packages/crypto`). Recovery-Key
wrapping (§8/§10's Recovery Key references) remains design-only until the
Recovery Key onboarding flow ships — see [RECOVERY.md](./RECOVERY.md).
Per-attachment DEKs (Phase 6, `apps/web` — mobile is Phase 6b) reuse this
same AES-256-GCM primitive unchanged, whole-buffer only (no chunking/
streaming), bounded by `firebase/storage.rules`' 50MB upload cap — see
`packages/vault/src/attachmentCrypto.ts` and
[DATA_MODEL.md](./DATA_MODEL.md) §3's implementation note. See also:
[SECURITY_THREAT_MODEL.md](./SECURITY_THREAT_MODEL.md),
[DATA_MODEL.md](./DATA_MODEL.md).

## 1. Primitives

| Purpose                            | Primitive        | Notes                                                                                                                    |
| ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Password-based key derivation      | **Argon2id**     | Memory-hard, side-channel-resistant hybrid mode. Parameters tuned per platform (see §6).                                 |
| Key stretching / domain separation | **HKDF-SHA-256** | Derives independent-purpose keys from a shared secret without reusing raw KDF output directly.                           |
| Authenticated symmetric encryption | **AES-256-GCM**  | Used for every item payload, attachment, and key-wrapping operation. 256-bit key, 96-bit random nonce, 128-bit auth tag. |
| Randomness                         | Platform CSPRNG  | `crypto.getRandomValues` (Web Crypto) / platform-native secure RNG (mobile). Never `Math.random()`.                      |

No custom/home-grown cryptographic algorithm is used anywhere in Kryvex. All
implementations come from maintained, widely-used libraries (exact package
choices are pinned in `packages/crypto` when Phase 3 begins; e.g. a WASM/native
Argon2id binding and the platform's native AES-GCM implementation via Web Crypto
/ `react-native-quick-crypto` or equivalent).

## 2. Key hierarchy

```
                         Master Password (never stored, never transmitted)
                                 │
                                 │  Argon2id(password, userSalt, params)
                                 ▼
                            Master Key (256-bit)
                                 │
                                 │  HKDF-SHA-256(MasterKey, info="kryvex-stretch")
                                 ▼
                       Stretched Master Key (256-bit)
                                 │
                    ┌────────────┴─────────────┐
                    │ wraps (AES-256-GCM)       │ derives (HKDF, distinct info)
                    ▼                           ▼
        Protected Vault Encryption Key     Master Password Hash
        (stored server-side; harmless      (sent to Firebase Auth as the
         without the Stretched Master      account "password" — see §4;
         Key to unwrap it)                 never the raw master password)
                    │
                    │ unwrap → Vault Encryption Key (256-bit, random,
                    │          generated once at signup, never changes
                    │          identity even if wrapping key rotates)
                    ▼
        ┌─────────────────────────────┬───────────────────────────────┐
        ▼                             ▼                                ▼
  Per-item Data Key            Per-attachment Data Key         Protected Recovery Key
  (random, wraps that          (random, wraps that             wrapping (Vault Key
   item's ciphertext)           attachment's ciphertext)        wrapped again under a
                                                                 user-held Recovery Key —
                                                                 see RECOVERY.md)
```

### Why envelope encryption (per-item/per-attachment data keys)

The Vault Encryption Key never directly encrypts item content. Instead, each
item/attachment gets its own random Data Encryption Key (DEK), which is what
actually encrypts the content; the DEK itself is wrapped by the Vault Encryption
Key. This means:

- **Key rotation** (rotating the Vault Encryption Key, e.g. after a suspected
  compromise) only requires re-wrapping every DEK, not re-encrypting every
  item's full content — cheap even for large vaults.
- **Future sharing/multi-recipient access** (v2 roadmap) becomes possible by
  wrapping a copy of a specific item's DEK under another user's public key,
  without touching that item's ciphertext.

### Why the Master Key is not used directly

The raw output of Argon2id is stretched via HKDF into purpose-separated keys
(one for wrapping the Vault Encryption Key, one for the value sent to Firebase
Auth) so that no single derived value is ever used for two different
cryptographic purposes.

## 3. Encrypted payload format

Every ciphertext blob stored in Firestore or Storage is serialized as a
versioned envelope so that algorithm/parameter changes are forward-compatible:

```json
{
  "v": 1,
  "alg": "AES-256-GCM",
  "nonce": "<base64, 12 bytes>",
  "ciphertext": "<base64, GCM auth tag appended by the cipher library>"
}
```

There is no separate `tag` field: `@noble/ciphers`' `gcm()` appends the
16-byte authentication tag to its `encrypt()` output, and `decrypt()` expects
it appended the same way — this is the actual, implemented convention (see
`packages/crypto/src/aead.ts`), not a placeholder for a future field.

Decryption always verifies the GCM authentication tag before any plaintext is
returned to calling code. A tag mismatch, corrupt nonce, or unknown `v`/`alg`
is treated as tampered/undecryptable data — it fails closed, is surfaced to the
user as "Unable to decrypt vault item," and is never partially trusted or
partially rendered.

## 4. Separation: Firebase Authentication vs. vault decryption

Firebase Authentication verifies the user is who they claim to be for the
purpose of authorizing Firestore/Storage access. It is a **separate secret**
from the vault:

- The value used to authenticate with Firebase (if using email/password auth)
  is a value **derived from** the master password via HKDF (see hierarchy
  above) — a distinct, one-way-derived value, not the master password itself
  and not the Vault-Encryption-Key-wrapping value. Compromising it does not
  reveal the master password or unwrap the vault key.
- A valid, authenticated Firebase session (e.g. an attacker with a stolen ID
  token) grants access to the user's **ciphertext** in Firestore/Storage — it
  does **not** grant the ability to decrypt it. `AUTHENTICATED_LOCKED` (see
  §61 of the build spec / lock state machine) is the expected state after
  Firebase sign-in and before the master password is entered.
- OAuth providers (Google/Apple Sign-In) authenticate identity only; they never
  substitute for the master password. A user who signs in via OAuth still sets
  a separate master password to protect the vault, and onboarding explains this
  clearly before setup completes.

### 4.1 Prelogin

Deriving the Firebase Auth value requires the account's `kdfSalt`/`kdfParams`
— but those live in the `users/{uid}` Firestore profile document, and its
security rule requires `request.auth.uid == uid` to read it (see
`docs/FIREBASE_SECURITY.md` §2). A client doesn't have a `uid` yet at
sign-in time, only an email — the standard "prelogin" problem every
zero-knowledge password manager (Bitwarden included) has to solve.

Resolved via a narrow, unauthenticated Cloud Function rather than a
deterministic (email-derived) salt: a deterministic salt would let an
attacker precompute a target's salt fully offline with zero contact with
Kryvex infrastructure, strictly weaker than a genuinely random per-account
salt. `getKdfParams(email)` (`firebase/functions/src/getKdfParams.ts`) uses
the Admin SDK — which bypasses Firestore rules entirely, so no rules change
was needed — to look up `uid` from `email` and return only
`{ kdfSalt, kdfParams }`, nothing else. It returns `null` uniformly for
"no such account" and "account exists but profile incomplete," matching how
established products avoid trivially distinguishing the two (see
`docs/SECURITY_THREAT_MODEL.md` §4 for the residual email-enumeration
discussion).

Full sign-in ordering:

```text
1. User enters email + master password
2. Client calls getKdfParams(email)              — unauthenticated
     -> null: show a generic "invalid email or password"
     -> { kdfSalt, kdfParams }: continue
3. Client derives Argon2id(masterPassword, kdfSalt, kdfParams) -> Master Key
4. Client derives HKDF(Master Key) -> { authSecret, Stretched Master Key }
5. Client calls signInWithEmailAndPassword(email, authSecret)
     -> wrong password: Firebase's own auth/invalid-credential,
        same generic UI message as step 2's null case
     -> success: AUTHENTICATED_LOCKED, then UNLOCKED using the
        already-derived Stretched Master Key (no extra round-trip)
```

Once authenticated, subsequent unlocks (e.g. after an app relaunch where the
Firebase session persisted but the in-memory key was lost) read
`kdfSalt`/`kdfParams` via the normal authenticated `users/{uid}` read
instead of calling `getKdfParams` again — there's no reason to hit the
unauthenticated endpoint once already signed in.

## 5. What the server can and cannot see

| Data                                                | Server sees                                        |
| --------------------------------------------------- | -------------------------------------------------- |
| Master password                                     | Never                                              |
| Vault Encryption Key (unwrapped)                    | Never                                              |
| Item content (passwords, notes, custom fields)      | Only AES-256-GCM ciphertext                        |
| Item titles / tags                                  | Ciphertext (see decision below)                    |
| Attachments                                         | Only AES-256-GCM ciphertext                        |
| Item type, id, revision, timestamps, tombstone flag | Plaintext (required for sync — see SYNC_ENGINE.md) |
| Account email / auth identifier                     | Plaintext (required for Firebase Auth)             |

**Decision:** item titles and tags are encrypted, not left in the clear, because
they can themselves be sensitive (e.g. a title of "Divorce Lawyer" or a tag of
"Affair"). Only structural sync metadata (opaque IDs, revision numbers,
timestamps, item _type_ enum, tombstone flag) stays unencrypted, because it is
needed for sync/authorization logic and does not itself disclose vault content.
This is documented as a deliberate metadata-minimization choice per the build
spec's privacy-over-convenience principle.

## 6. Argon2id parameters

Exact tuned values are set in Phase 3 (implementation) benchmarking against real
target devices, but the design targets:

- **Web:** memory ≥ 64 MiB, iterations tuned for ~500ms–1s unlock time on
  mid-range hardware, parallelism = 1 (browser WASM constraint).
- **Mobile:** memory ≥ 64 MiB where device RAM budget allows, tuned similarly
  for a sub-1-second unlock on mid-tier devices from the last ~4 years.
- Parameters are recorded per-account (alongside the salt) in the account's
  non-secret Firestore profile document, so they can be strengthened over time
  for new/re-derived unlocks (client re-derives with new params + re-wraps the
  Protected Vault Encryption Key) without breaking older stored data.

## 7. Key storage

- **Server (Firestore, non-secret profile doc):** Argon2id salt + params, the
  Protected Vault Encryption Key (wrapped, harmless without the Stretched
  Master Key), and — if the user completed recovery-kit setup — the
  Recovery-Key-wrapped copy of the Vault Encryption Key.
- **Web client (in memory only, cleared on lock):** Stretched Master Key,
  unwrapped Vault Encryption Key, any unwrapped item/attachment DEK currently
  in use. Never written to `localStorage`. An encrypted local cache (ciphertext
  only) may live in IndexedDB for offline-first access.
- **Mobile client:** same in-memory rule for unwrapped key material; biometric
  unlock protects a Keychain (iOS) / Keystore (Android) entry that itself holds
  the wrapped Vault Encryption Key material or an equivalent locally-scoped
  unlock secret — never the master password.

## 8. Key rotation

Rotating the Vault Encryption Key (e.g., proactive rotation, suspected
compromise short of full device compromise):

1. Client generates a new Vault Encryption Key.
2. Client re-wraps every item/attachment DEK under the new Vault Encryption Key
   (cheap — DEKs are small; item ciphertext itself is untouched).
3. Client re-wraps the new Vault Encryption Key under the Stretched Master Key
   (and under the Recovery Key, if recovery is set up) and uploads the new
   Protected Vault Encryption Key + re-wrapped DEKs.
4. Old wrapped values are retained briefly for rollback safety, then deleted.

Rotating the master password (changing the password itself) re-derives the
Master Key/Stretched Master Key via Argon2id with a fresh salt and re-wraps the
existing Vault Encryption Key — item/attachment DEKs and ciphertext are
untouched, since the Vault Encryption Key's identity does not change.

## 9. Lock / logout / account deletion behavior

- **Lock:** all unwrapped key material is discarded from memory. Ciphertext
  already cached locally remains (still unreadable without unlocking again).
- **Logout:** lock behavior, plus the Firebase session is cleared. Locally
  cached ciphertext may be retained or purged per user setting/device trust
  level (documented at implementation time).
- **Account deletion:** the account's profile doc (including the Protected
  Vault Encryption Key and recovery wrapping), all item documents, and all
  Storage attachment blobs are deleted. See build spec §47 / future
  `docs/RECOVERY.md` and `KRYVEX_SOURCE_OF_TRUTH.md` for exact deletion
  ordering and any grace period.

## 10. Lost/stolen device implications

Because the Vault Encryption Key is derived from the master password (knowledge
factor), not bound to a specific device, a lost/stolen device does **not** by
itself expose the vault to someone who does not know the master password and
cannot defeat the device's Keychain/Keystore-protected biometric unlock. Mobile
biometric unlock caches only a device-locally-scoped unlock secret protected by
the platform secure enclave — see §5 of the threat model for the residual risk
of a fully compromised OS. Recommended user action for a lost/stolen device:
sign out of all sessions (revokes Firebase refresh tokens) and, if biometric
unlock was enabled, treat the device as untrusted going forward.

## 11. Testing requirements (see also build spec §42)

- `encrypt(plaintext) != plaintext` for all item/attachment paths.
- `decrypt(encrypt(plaintext)) == plaintext` (round-trip).
- Wrong password → cannot unwrap Vault Encryption Key.
- Wrong/tampered key → decryption fails closed.
- Corrupted ciphertext / modified nonce / modified auth tag → AEAD verification
  fails, no plaintext returned.
- Invalid/unknown envelope version → rejected, not best-effort parsed.
- Argon2id determinism: same password + salt + params → same Master Key.
