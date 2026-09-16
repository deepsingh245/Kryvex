# Kryvex — Session Status Snapshot

Not part of the permanent doc set (not committed, not referenced by
`CLAUDE.md`'s read order). This is a point-in-time handoff note for
resuming work in a new chat. The actual source of truth remains
`KRYVEX_SOURCE_OF_TRUTH.md` and `PLAN.md` — read those first in any new
session; this file just summarizes where things stood as of the date below
so you don't have to reconstruct it from conversation history.

Snapshot date: 2026-09-13

---

## Strategy: web-first to completion

`apps/web` is being taken to full completion — every remaining phase
through release — before any further `apps/mobile` work resumes, including
the already-scoped Phase 6b (attachments on mobile). See `PLAN.md` §4, split
into a **Web-completion track** (current focus) and a **Mobile-completion
track** (deferred until the web track reaches release).

## Where we are: Phase 8w done; Phase 9w next

| Phase           | Status                  | What it covers                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0-6             | **Done**                | Architecture, foundation, auth, crypto core, vault CRUD (web+mobile), sync (web+mobile), attachments (web)                                                                                                                                                                                                                                                                                                                                    |
| 7w              | **Done**                | Web session security + Recovery Key — real `packages/security/autoLock.ts`/`clipboard.ts` implementations wired into `apps/web` ("Lock" button, idle-timeout/tab-hidden auto-lock, clipboard-clear-after-timeout), plus the full Recovery Key/Emergency Kit flow (`docs/RECOVERY.md`) via a new `getRecoveryEnvelope` Cloud Function and Firebase's own password-reset oobCode flow                                                           |
| **8w**          | **Done (this session)** | UX polish (web) — a real `/settings` screen wired to `autoLockMinutes`/`clipboardClearSeconds`/`biometricUnlockEnabled` (previously hardcoded), `clipboardClearSeconds` threaded to every Copy button, accessibility fixes (label association, `aria-pressed`, `aria-live` copy announcement, new `aria-label`s), error-surfacing for the listener/conflict-resolution failure paths, responsive-layout fixes, `autoFocus` on every auth page |
| 9w              | **Next — not started**  | Security hardening (web + shared packages)                                                                                                                                                                                                                                                                                                                                                                                                    |
| 10w             | Not started             | Release (web) — production Firebase project, web deploy                                                                                                                                                                                                                                                                                                                                                                                       |
| 6b/7m/8m/9m/10m | **Deferred**            | Mobile completion track — picked up only after 10w ships                                                                                                                                                                                                                                                                                                                                                                                      |

## What actually works right now (apps/web)

Sign up (with a one-time Emergency Kit shown), sign in, sign out, lock
(manual button, idle timeout, or tab-hidden — now configurable via
`/settings`), unlock, full vault CRUD (all 12 item types including
image/PDF/file attachments), offline-first sync with conflict resolution
(now surfaced on failure), encrypted file upload/preview/download,
clipboard auto-clear on copied secrets (delay configurable via `/settings`),
and full account recovery via Recovery Key + emailed link if the master
password is forgotten — all against the real Firebase emulator.

`apps/mobile` is at Phase 5b (vault CRUD + sync), unaffected by this
session's `apps/web` work — expected to stay behind until the web track
finishes.

To run web:

```bash
firebase emulators:start --only auth,firestore,storage,functions   # terminal 1
pnpm --filter @kryvex/web dev                                       # terminal 2
```

Then open `http://localhost:3000`.

**Not yet done / flagged follow-ups:** a manual browser click-through of
sign-up → Emergency Kit → sign-out → recover → new master password, of the
idle-timeout/tab-hidden auto-lock behavior, and (new this session) of the
`/settings` screen and the four responsive-layout fixes at phone width (no
browser automation tool available this session).

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

Start Phase 9w (security hardening): plan it first, then implement per the
project's established plan-then-approve workflow. Do **not** start any
`apps/mobile` work (including Phase 6b) until the web track (through 10w)
is done.
