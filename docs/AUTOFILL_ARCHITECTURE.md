# Kryvex — Future Autofill Architecture

Status: Phase 0 draft. Not implemented in V1 (see build spec §28, §74). This
document exists so the V1 data model and vault APIs don't have to be reshaped
later. See also: [DATA_MODEL.md](./DATA_MODEL.md).

## 1. Why this is written now, built later

Autofill integrations (Android Autofill Framework, iOS Credential Provider
Extension, a browser extension) all need the same three things from the core
vault: a way to match a request context (a domain or app package) to
candidate items, a way to hand back credentials without the host app/OS ever
seeing the master password, and a way to trigger password generation
in-context. Designing the data model with these needs in mind now avoids a
breaking schema migration later.

## 2. What the V1 data model already provides

- `LoginContent.websites: string[]` (see DATA_MODEL.md) — a login item can be
  associated with multiple URLs/domains, which is the minimum needed for
  domain-based matching later.
- Stable, client-generated item `id`s that autofill providers can reference.
- A clean separation between "vault is unlocked" and "vault is locked" (the
  lock state machine) that any future extension process must also respect —
  an autofill request must never be servable while the vault is locked without
  going through the same unlock flow (master password or biometric-gated
  local key) as the main app.

## 3. Android Autofill Framework (future)

- Kryvex would implement an `AutofillService` that, when the vault is
  **unlocked** (sharing unlock state with the main app via the same secure
  local storage described in CRYPTOGRAPHIC_ARCHITECTURE.md §7), matches the
  requesting app's package name / associated web domain against
  `LoginContent.websites` and offers matching items in the system autofill UI.
- If the vault is locked, the service prompts for biometric/master-password
  unlock through the same code path as opening the app directly — never a
  separate, weaker unlock mechanism.
- Package-name-to-domain association will need a mapping strategy (e.g.
  Google's Digital Asset Links `assetlinks.json` verification) to avoid
  offering credentials to a spoofing app claiming a domain it doesn't own.

## 4. iOS Credential Provider Extension (future)

- A `ASCredentialProviderViewController` extension, sharing the Keychain
  access group with the main app so it can reach the same locally-protected
  key material described in CRYPTOGRAPHIC_ARCHITECTURE.md §7 without
  duplicating secure storage.
- Domain matching uses the same `LoginContent.websites` field; associated
  domains are declared via Apple's `apple-app-site-association` mechanism for
  the equivalent of Android's asset-links verification.
- Extension processes are memory-constrained and short-lived — decrypted key
  material must be scoped tightly to the single autofill request and cleared
  immediately after, not cached across invocations.

## 5. Browser extension (future)

- A separate, minimal-permission browser extension that:
  1. Detects login forms on the active page.
  2. Matches the page's origin against `LoginContent.websites`.
  3. Requests the matching item's credentials from the already-unlocked main
     Kryvex session (e.g. via native messaging to a companion app, or a
     dedicated unlock flow inside the extension's own isolated storage) —
     never by re-implementing its own copy of the vault key hierarchy.
  4. Fills the form and can invoke the password generator in-context.
- The extension is treated as an additional untrusted surface in the threat
  model (build spec §3 lists "malicious browser extension" as an in-scope
  threat for _other_ extensions attacking Kryvex — Kryvex's own extension must
  hold itself to the same minimal-permission, minimal-DOM-exposure standard).
- Not built until a dedicated security review of the extension's permission
  footprint and messaging channel is done.

## 6. Explicit non-goals for V1

- No autofill service, credential provider extension, or browser extension
  ships in V1. This document defines the target shape only.
- TOTP-based autofill (filling a 2FA code) depends on the TOTP fields already
  reserved in `LoginContent.totp` (DATA_MODEL.md) but is itself a v1.5+
  feature (build spec §29).
