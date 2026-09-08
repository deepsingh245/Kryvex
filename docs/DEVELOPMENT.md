# Kryvex — Development Guide

Status: Phase 0 draft; commands below become real once Phase 1 scaffolding
lands. This is the reference for "how do I run/test this" once code exists —
kept in sync as tooling is added.

## 1. Confirmed local tooling (this environment)

| Tool                | Version  |
| ------------------- | -------- |
| Node.js             | v24.13.0 |
| npm                 | 11.6.2   |
| pnpm (via Corepack) | 12.3.4   |
| git                 | 2.45.1   |
| firebase-tools      | 15.25.1  |

Mobile: Expo is used via the local per-project `expo` package and
`npx create-expo-app` at scaffolding time rather than the deprecated global
`expo-cli`.

## 2. Package manager & monorepo tooling

- **pnpm workspaces** for dependency management (`pnpm-workspace.yaml`).
- **Turborepo** for task orchestration/caching across `apps/*` and
  `packages/*` (`turbo.json`).
- Enable pnpm via Corepack: `corepack enable` (already available in this
  environment).

## 3. Planned root scripts (Phase 1)

```bash
pnpm install          # install all workspace dependencies
pnpm dev               # run web + mobile dev servers via turbo
pnpm build             # build all apps/packages
pnpm lint              # lint all workspaces
pnpm typecheck         # tsc --noEmit across workspaces
pnpm test              # unit + integration tests (Vitest/Jest)
pnpm test:security     # Firestore/Storage rules tests against the emulator
pnpm test:e2e          # Playwright (web) end-to-end tests
```

## 4. Firebase Emulator Suite

Development and rule tests run against the local emulator, never production
Firebase, per build spec §44:

```bash
firebase emulators:start --only auth,firestore,storage,functions
```

`apps/web`/`apps/mobile` point at the emulator via environment variables in
development (see §5); `packages/firebase`'s client wrapper picks the emulator
host automatically when `NODE_ENV !== "production"` and an emulator env var is
set, so no code path accidentally targets production during local dev.

## 5. Environment variables

`.env.example` (committed) documents required variables, split explicitly per
build spec §45:

```
# PUBLIC CONFIG (safe in the client bundle — Firebase web config is not a secret)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true

# SECRET CONFIG (server-only; never referenced from client bundles)
FIREBASE_SERVICE_ACCOUNT_JSON=   # used only by Cloud Functions / CI, never shipped to apps/web or apps/mobile
```

No `.env` file with real values is ever committed. `.env.example` contains
placeholder values only.

## 6. Secure logging

`packages/security` exposes `secureLogger.{info,warn,error}` (build spec §38).
Application code must not call `console.log` on vault objects, item content,
or any decrypted secret in non-test code. Lint rule to be added in Phase 1 to
flag raw `console.log` usage outside `packages/security` itself and test
files.

## 7. Testing strategy summary

Full detail lives in the build spec §41–§43; the short version enforced from
Phase 1 onward:

- Unit tests for `packages/crypto`, `packages/password-generator`,
  `packages/validation`, `packages/sync` are mandatory before those packages
  are considered done, not added retroactively.
- Firestore/Storage rule tests run against the emulator in CI on every change
  to `firebase/*.rules`.
- No PR that touches encryption, authentication, authorization, storage,
  sync, key management, or attachment handling merges without the security
  review step in build spec §63 having been done and noted in the PR/commit
  description.

## 8. Contributing workflow (once code exists)

1. Read `CLAUDE.md` and `KRYVEX_SOURCE_OF_TRUTH.md` first.
2. Inspect only the relevant part of the codebase for the task at hand.
3. Implement with small, logically-scoped commits (build spec §68 commit
   message conventions: `feat(scope): ...`, `fix(scope): ...`).
4. Run `pnpm lint && pnpm typecheck && pnpm test` (and `pnpm test:security` if
   Firebase rules/functions changed) before considering a change done.
5. Update the relevant `docs/*.md` and `KRYVEX_SOURCE_OF_TRUTH.md` if the
   change affects architecture or behavior described there.
