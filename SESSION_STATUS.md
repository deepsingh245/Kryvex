# Kryvex — Session Status Snapshot

Not part of the permanent doc set (not committed, not referenced by
`CLAUDE.md`'s read order). This is a point-in-time handoff note for
resuming work in a new chat. The actual source of truth remains
`KRYVEX_SOURCE_OF_TRUTH.md` and `PLAN.md` — read those first in any new
session; this file just summarizes where things stood as of the date below
so you don't have to reconstruct it from conversation history.

Snapshot date: 2026-09-13

---

## Strategy change this session: web-first to completion

Previously each phase shipped for web then got an immediate mobile port
("Xb": 4→4b, 5→5b, 6→6b). **That's changed.** `apps/web` is now taken to
full completion — every remaining phase through release — before any
further `apps/mobile` work resumes, including the already-scoped Phase 6b
(attachments on mobile). See `PLAN.md` §4, now split into:

- **Track A — Web completion** (current focus, uninterrupted)
- **Track B — Mobile completion** (deferred until Track A reaches release)

Phases already done on both platforms (4, 5) are unaffected by this — it's
only the not-yet-started work that got reordered.

## Where we are: Phase 6 (Attachments, web) done; Phase 7w next

| Phase           | Status                 | What it covers                                                                                                                                                                                                  |
| --------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0               | **Done**               | Architecture docs — threat model, crypto design, data model, Firebase security design, sync design, etc.                                                                                                        |
| 1               | **Done**               | Monorepo scaffold — `apps/{web,mobile}`, all `packages/*`, Firebase emulator config, CI                                                                                                                         |
| 2               | **Done**               | Real auth — Firebase Auth, Argon2id/HKDF key derivation, prelogin (`getKdfParams`), lock state machine, sign-up/sign-in/unlock screens                                                                          |
| 3               | **Done**               | Real crypto — AES-256-GCM (`@noble/ciphers`), Vault Encryption Key generate/wrap/unwrap, fail-closed unlock, full test coverage                                                                                 |
| 4               | **Done (web+mobile)**  | Vault — all 11 item types, custom fields, password generator, favorites, tags, search                                                                                                                           |
| 5               | **Done (web+mobile)**  | Sync — encrypted Firestore records, offline-first, versioning, conflicts (always offer keep-mine/keep-server's/keep-both), tombstones + GC                                                                      |
| 6               | **Done (web)**         | Attachments — encrypted image/PDF/file upload/preview/download, Storage, `isValidAttachment` rule, `attachmentGc`. Mobile port (6b) deferred — see strategy change above.                                       |
| **7w**          | **Next — not started** | Web session security — real `packages/security/autoLock.ts` (lock on background/inactivity/explicit lock/session expiry) and `clipboard.ts` (clear-after-timeout) implementations, both currently Phase-1 stubs |
| 8w              | Not started            | UX polish (web) — responsive UI, accessibility, onboarding incl. Recovery Key kit, empty/error/loading states                                                                                                   |
| 9w              | Not started            | Security hardening (web + shared packages) — XSS/CSRF/rules/crypto/logging/deps review                                                                                                                          |
| 10w             | Not started            | Release (web) — production Firebase project, web deploy                                                                                                                                                         |
| 6b/7m/8m/9m/10m | **Deferred**           | Mobile completion track — picked up only after 10w ships. See `PLAN.md` §4 Track B.                                                                                                                             |

## What actually works right now (apps/web)

Sign up, sign in, sign out, unlock, full vault CRUD (all 11 item types
including image/PDF/file attachments), offline-first sync with conflict
resolution, and encrypted file upload/preview/download — all against the
real Firebase emulator.

`apps/mobile` is at Phase 5b (vault CRUD + sync), one phase behind web
(attachments not yet ported) — this is now expected and will stay that way
until the web track finishes.

To run web:

```bash
firebase emulators:start --only auth,firestore,storage,functions   # terminal 1
pnpm --filter @kryvex/web dev                                       # terminal 2
```

Then open `http://localhost:3000`.

## Key standing constraints (already saved to persistent memory, but restated here)

- **Never `git push`** — the user pushes to GitHub themselves.
- **Never add AI/Claude attribution to commit messages** in this repo —
  overrides any generic global attribution guidance.
- **Never commit unless explicitly asked** — nothing from this session has
  been committed.
- The user sometimes commits code changes themselves directly (via their
  own editor/tooling) mid-session, under generic auto-generated commit
  messages — don't assume uncommitted-looking work is actually
  uncommitted; check `git log`/`git status` before concluding something
  needs committing.

## Recommended next step

Start Phase 7w (web session security): plan it first (auto-lock trigger
set — background/inactivity/explicit lock/session expiry — and where the
timer lives given `VaultProvider`'s existing lock state machine; clipboard
clear-after-timeout wired into `SecretField`'s copy button), then implement
per the project's established plan-then-approve workflow. Do **not** start
any `apps/mobile` work (including Phase 6b) until the web track (through
10w) is done.
