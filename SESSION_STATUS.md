# Kryvex — Session Status Snapshot

Not part of the permanent doc set (not committed, not referenced by
`CLAUDE.md`'s read order). This is a point-in-time handoff note for
resuming work in a new chat. The actual source of truth remains
`KRYVEX_SOURCE_OF_TRUTH.md` and `PLAN.md` — read those first in any new
session; this file just summarizes where things stood as of the date below
so you don't have to reconstruct it from conversation history.

Snapshot date: 2026-09-11

---

## Where we are: Phase 3 of 10 complete, Phase 4 next

| Phase | Status                 | What it covers                                                                                                                                                                                                                                                                                         |
| ----- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | **Done**               | Architecture docs — threat model, crypto design, data model, Firebase security design, sync design, etc.                                                                                                                                                                                               |
| 1     | **Done**               | Monorepo scaffold — `apps/{web,mobile}`, all `packages/*`, Firebase emulator config, CI                                                                                                                                                                                                                |
| 2     | **Done**               | Real auth — Firebase Auth, Argon2id/HKDF key derivation, prelogin (`getKdfParams`), lock state machine, sign-up/sign-in/unlock screens                                                                                                                                                                 |
| 3     | **Done**               | Real crypto — AES-256-GCM (`@noble/ciphers`), Vault Encryption Key generate/wrap/unwrap, local fail-closed unlock (wrong password fails via AEAD tag mismatch, not just a Firebase rejection). Test coverage added: `packages/crypto/src/aead.test.ts` + 3 new cases in `tests/auth/authFlow.test.ts`. |
| 4     | **Not started — next** | Vault — actual item CRUD (Login/Secure Note/Identity/Card/PIN/API Key/Recovery Codes/Image/PDF/File/Custom), custom fields, password generator UI, favorites, tags, search. Consumes Phase 3's `generateKey`/`encryptBytes`/`decryptBytes` per item.                                                   |
| 5     | Not started            | Sync — encrypted Firestore records, offline support, versioning, conflict resolution, tombstones                                                                                                                                                                                                       |
| 6     | Not started            | Attachments — encrypted image/PDF/file uploads to Storage, secure previews                                                                                                                                                                                                                             |
| 7     | Not started            | Mobile security — biometric unlock, Keychain/Keystore-backed secure storage, auto-lock, clipboard clearing, screenshot protection                                                                                                                                                                      |
| 8     | Not started            | UX polish — responsive UI, accessibility, onboarding (including the Recovery Key kit, deferred from Phase 3), empty/error/loading states                                                                                                                                                               |
| 9     | Not started            | Security hardening — dedicated review pass: XSS/CSRF, rules, crypto, logging, dependencies                                                                                                                                                                                                             |
| 10    | Not started            | Release — production Firebase project, web deploy, iOS/Android builds (EAS), release checklist                                                                                                                                                                                                         |

**Rough completion:** 3/10 phases by count, but phases 0-3 were foundation/
auth/crypto plumbing — the actual product (vault items) starts at Phase 4.
Realistically ~20-25% of the product surface, not 30%.

## What actually works right now

Sign up, sign in, sign out, and unlock (correct or wrong master password)
against the real Firebase emulator, on web (and mobile, if
`apps/mobile/.env.local` is filled in). **No vault content exists yet** —
no items, no search, no tags. That's all Phase 4.

To run it:

```bash
firebase emulators:start --only auth,firestore,storage,functions   # terminal 1
pnpm --filter @kryvex/web dev                                       # terminal 2
```

Then open `http://localhost:3000`.

## Key standing constraints (already saved to persistent memory, but restated here)

- **Never `git push`** — the user pushes to GitHub themselves.
- **Never add AI/Claude attribution to commit messages** in this repo —
  overrides any generic global attribution guidance.
- The user sometimes commits code changes themselves directly (via their own
  editor/tooling) mid-session, under generic auto-generated commit messages —
  don't assume uncommitted-looking work is actually uncommitted; check
  `git log`/`git status` before concluding something needs committing.

## Recommended next step

Start Phase 4 (Vault): plan it first (item types, custom-field model, how
`VaultItemDocument` CRUD wires through `packages/sync`... actually Sync is
Phase 5, so Phase 4 should scope to local/direct Firestore reads+writes of
encrypted items without the full offline/conflict machinery), then implement
per the project's established phase-by-phase, plan-then-approve workflow.
