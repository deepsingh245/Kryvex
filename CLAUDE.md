# Kryvex — Instructions for Claude

Read this before doing anything else in this repo.

## 1. Read order

1. This file.
2. `KRYVEX_SOURCE_OF_TRUTH.md` — the primary reference. It answers "what is
   the architecture / data model / key hierarchy / Firebase structure / sync
   design" without needing to re-scan the repo.
3. Only then, the specific `docs/*.md` file relevant to the task (linked from
   the source of truth) and only the specific code files relevant to the
   task at hand.

**Do not repeatedly re-read the entire repository.** The source of truth
exists precisely so that isn't necessary. If the source of truth seems stale
relative to the code, trust the code, fix the doc, and note the discrepancy.

## 2. Non-negotiable constraint

> The server must never need access to plaintext vault contents.

Every change is checked against this before anything else. If a task would
require the server (Firestore, Storage, Cloud Functions) to see, log, or
process plaintext vault content, stop and flag it rather than implementing it.

## 3. Hard rules (see `docs/SECURITY_THREAT_MODEL.md` §7 for the full list)

Never: log passwords/master password/decrypted vault objects; put secrets in
URLs, analytics, or crash reports; use `Math.random()` for anything
security-sensitive; invent or modify cryptographic algorithms; use MD5/SHA-1/
plain SHA-256 for password handling; hard-code keys; commit real secrets;
store plaintext secrets in `localStorage`/`AsyncStorage`; build any
server-side capability that can decrypt a user's vault; treat a Firebase
Auth session as sufficient to unlock the vault; trust client-side checks for
authorization; silently overwrite a sync conflict; claim the product is
"unhackable" or "military-grade" anywhere in code, comments, or docs.

## 4. Workflow for every implementation task

1. Read `CLAUDE.md` (this file) and `KRYVEX_SOURCE_OF_TRUTH.md`.
2. Inspect only the relevant part of the codebase — don't do a cold full-repo
   sweep when the source of truth already answers the structural question.
3. State briefly what you intend to change before changing it.
4. Implement.
5. Run the relevant tests/typecheck/lint (`pnpm test`, `pnpm typecheck`,
   `pnpm lint`, and `pnpm test:security` if Firestore/Storage rules or Cloud
   Functions changed).
6. **If the change touches encryption, authentication, authorization,
   storage, synchronization, key management, password handling, or
   attachment handling: stop and explicitly review it for security
   implications before considering it done** (build spec §63). Don't skip
   this because the change "looks small."
7. Update the relevant `docs/*.md` and `KRYVEX_SOURCE_OF_TRUTH.md` if the
   change affects architecture or documented behavior. A behavior change
   without a doc update is an incomplete change.
8. Report: what changed, what tests ran, security considerations, files
   touched, recommended next step.

## 5. Preserve existing architecture

Do not casually introduce a new key derivation scheme, a new encryption
primitive, a new Firestore collection shape, or a new sync conflict strategy
without updating the corresponding `docs/*.md` and getting this reflected in
`KRYVEX_SOURCE_OF_TRUTH.md`'s decisions log. If an existing decision turns out
to be wrong, change it deliberately and visibly — don't drift away from it
silently in one PR.

## 6. Current project status

Phase 0 (architecture/docs) is complete. No application code, monorepo
scaffolding, or Firebase project exists yet. See "Current status" at the
bottom of `KRYVEX_SOURCE_OF_TRUTH.md` and `PLAN.md` for the phase roadmap.
Do not skip ahead into later-phase work (e.g. attachments, autofill, mobile
biometrics) before the phase it depends on is actually in place — check
`PLAN.md`'s phase table before starting unscoped work.
