# Kryvex — Backup & Recovery

Status: Implemented for `apps/web` (Phase 7w). §2's Recovery Key/Emergency
Kit flow runs at sign-up (`apps/web/src/providers/VaultProvider.tsx`'s
`signUp`, `packages/ui/src/components/EmergencyKit.tsx`); §3's recovery flow
runs via `apps/web/src/app/recover`/`recover/confirm`, `VaultProvider.tsx`'s
`recoverVault`, and `firebase/functions/src/getRecoveryEnvelope.ts` (the
Recovery-Key-side counterpart to `getKdfParams.ts`'s prelogin problem). One
implementation detail beyond what's written below: recovering the Auth
credential (needed since the derived `authSecret` is also unknown once the
master password is forgotten) goes through Firebase's own
`sendPasswordResetEmail`/`confirmPasswordReset` oobCode flow — this doubles
as the "prove you still control the email inbox" factor, independent of
Recovery Key possession; neither alone completes recovery. §4's "no kit,
password lost" messaging and §6's future improvements remain not built
(v1.5+, as already scoped). No QR code in the kit yet — text + downloadable
file only. `apps/mobile` has not been ported to this — see `PLAN.md`'s
Track B. See also:
[CRYPTOGRAPHIC_ARCHITECTURE.md](./CRYPTOGRAPHIC_ARCHITECTURE.md).

## 1. The core tension

Because Kryvex is zero-knowledge (the server never holds a key capable of
decrypting the vault), a traditional "forgot password → email a reset link →
regain access" flow **cannot** apply to the master password. Sending a reset
email can, at most, let a user regain a new empty vault or reset their
_Firebase Auth_ credential — it can never recover the _existing_ encrypted
vault, because nothing server-side can unwrap the Vault Encryption Key without
the master password (or the recovery mechanism below).

This is a deliberate trade-off, not an oversight: weakening it (e.g., storing
a server-side escrow key) would break the zero-knowledge guarantee the entire
threat model rests on. See SECURITY_THREAT_MODEL.md §5.

## 2. V1 recovery mechanism: Recovery Key / Emergency Kit

At onboarding (build spec §54), after the master password is confirmed:

1. The client generates a random 256-bit **Recovery Key**.
2. The Vault Encryption Key is wrapped a second time under this Recovery Key
   (AES-256-GCM), producing `protectedVaultKeyByRecovery`
   (see DATA_MODEL.md §4), which is uploaded alongside the normal
   password-wrapped copy.
3. The Recovery Key itself is shown to the user **once**, formatted for
   reliable transcription (e.g. grouped alphanumeric blocks + a QR code), as
   part of a downloadable/printable "Emergency Kit." The Emergency Kit
   explicitly does not contain the master password, any item content, or
   anything else — only the Recovery Key and instructions.
4. The Recovery Key is never transmitted to or stored by Kryvex in
   unwrapped form. Kryvex only ever stores the _wrapped Vault Encryption Key_
   produced with it (§2 above) — losing the Emergency Kit means Kryvex has no
   way to reconstruct the Recovery Key.
5. Onboarding requires an explicit acknowledgment step before continuing:

   > If you lose both your master password and your Emergency Kit, Kryvex
   > cannot recover your vault. There is no backdoor — that's what makes your
   > data private.

## 3. Recovery flow (master password forgotten, Emergency Kit available)

1. User selects "Recover with Emergency Kit" from the locked/sign-in screen.
2. User enters (or scans the QR code for) the Recovery Key.
3. Client fetches `protectedVaultKeyByRecovery` and unwraps it locally to
   obtain the Vault Encryption Key — this never leaves the device and the
   server plays no role beyond serving the already-stored ciphertext.
4. User sets a **new** master password. Client derives a new Master
   Key/Stretched Master Key via Argon2id (fresh salt), re-wraps the (now
   unwrapped, still-original) Vault Encryption Key under it, and uploads the
   new `protectedVaultKey`. Existing item/attachment content is untouched
   (the Vault Encryption Key's identity never changed — see
   CRYPTOGRAPHIC_ARCHITECTURE.md §8).
5. Optionally, the user can generate a new Recovery Key at this point
   (recommended, since the old Emergency Kit was just used and should be
   considered spent/rotated).

## 4. No Emergency Kit, master password lost

The vault is unrecoverable by design. The UI states this plainly rather than
implying a support-ticket workaround exists:

> We can't recover this vault without your master password or Emergency Kit.
> You can start over with a new vault, but existing items cannot be restored.

Kryvex does not offer a "contact support to regain access" path that implies a
server-side decrypt capability exists, because none does (build spec §69).

## 5. Firebase Auth password reset (separate concern)

A user can still reset their _Firebase Auth_ sign-in credential (e.g. via
email link) to regain the ability to authenticate — this only restores access
to the _authenticated-but-locked_ state and to attempting vault unlock; it has
no bearing on vault decryption, consistent with the identity/decryption
separation in CRYPTOGRAPHIC_ARCHITECTURE.md §4.

## 6. Future improvements (v1.5+, not required for V1)

- Device-to-device recovery (an already-unlocked trusted device re-wraps the
  Vault Encryption Key for a new device via a locally-scoped exchange,
  without involving the master password at all).
- Trusted-contact / social recovery (splitting a recovery secret across
  contacts) — deferred; needs its own dedicated security design before
  building.

## 7. Account deletion vs. recovery

Account deletion (build spec §47) is irreversible and distinct from recovery:
deleting an account removes the profile document (including both wrapped
copies of the Vault Encryption Key) and all item/attachment data. There is no
recovery path after deletion, and the UI requires re-authentication + explicit
confirmation before deletion proceeds (build spec §49).
