# Kryvex — Development Guide

Status: Phase 2 (Authentication) complete — the commands below are real and
verified. This is the reference for "how do I run/test this" — kept in sync
as tooling is added.

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

## 3. Root scripts

```bash
pnpm install           # install all workspace dependencies
pnpm dev                # run web + mobile dev servers via turbo
pnpm build              # build all apps/packages
pnpm lint                # lint all workspaces, then `prettier --check .`
pnpm format             # `prettier --write .`
pnpm typecheck          # tsc --noEmit across workspaces (apps/web also runs `next typegen` first)
pnpm test               # unit tests (Vitest for packages/apps/web, Jest for apps/mobile)
pnpm test:security      # Firestore/Storage rules tests, run only via `firebase emulators:exec`
pnpm test:auth          # Auth/prelogin flow tests, run only via `firebase emulators:exec` (rebuilds firebase/functions first)
pnpm test:e2e           # reserved — no-op until Phase 8 (no Playwright wired yet)
```

Known TypeScript-6.0.3-under-pnpm quirks worked around in the shared config
(`packages/tsconfig/base.json`, `apps/mobile/tsconfig.json`) rather than left
as recurring friction:

- `@types/node`/`@types/jest` aren't reliably auto-discovered per-package, so
  every package explicitly lists `"types": [...]` instead of relying on
  automatic `@types/*` scanning.
- TS project references/`composite` mode were dropped — they required a
  referenced package's `dist/*.d.ts` to already exist for plain
  `tsc --noEmit`, which conflicted with Turborepo owning build order.
  Cross-package types resolve fine via `package.json`'s `types` field
  pointing straight at `src/index.ts`.
- `firebase/functions/tsconfig.json` uses `"ignoreDeprecations": "6.0"`
  (inherited from the shared base) because tsup's `--dts` step internally
  injects a deprecated `baseUrl` when bundling declarations — not something
  this repo's own config sets.
- `apps/web`'s ESLint config does **not** reuse `@kryvex/eslint-config/react`
  — layering it with `eslint-config-next` throws ("Cannot redefine plugin"),
  since both register their own typescript-eslint/plugin instances under
  flat config. `apps/web/eslint.config.mjs` composes `eslint-config-next`
  directly instead.
- `eslint-plugin-react`'s `settings.react.version` is pinned (e.g. `"19.2"`)
  rather than `"detect"` everywhere: its auto-detection path calls an API
  ESLint 10 removed. `eslint-plugin-react-native` is not wired in yet for
  the same reason (not ESLint 10 compatible as of this writing).
- `apps/mobile` depends on `test-renderer` (not the deprecated
  `react-test-renderer`) to match `@testing-library/react-native@14`'s peer
  dependency, and its `render()` call must be awaited (async as of v14).

Phase 2 additions and gotchas:

- `pnpm test:auth` runs `firebase emulators:exec --only auth,firestore,functions`
  against the new `tests/auth` workspace — real sign-up/sign-in/prelogin
  flow, not mocks. It explicitly rebuilds `firebase/functions` first
  (`pnpm --filter @kryvex/functions build && ...`): the emulator serves
  whatever's already in `dist/`, and neither `firebase emulators:exec` nor
  `emulators:start` rebuilds it for you — editing `firebase/functions/src/*`
  and re-running the emulator without rebuilding silently runs stale code.
  Learned the hard way: a missing `admin.initializeApp()` call (now in
  `firebase/functions/src/index.ts`) manifested as every Admin-SDK-using
  callable returning a raw HTTP 401 `UNAUTHENTICATED` — a very misleading
  symptom for "the Admin SDK was never initialized," discovered only by
  bypassing the Functions SDK and hitting the emulator's raw HTTP endpoint
  directly to see the actual response body.
- `firebase/functions/tsconfig.build.json` (extends the main tsconfig,
  excludes `**/*.test.ts`) is what `pnpm build` actually uses
  (`tsc -p tsconfig.build.json`) — the plain `tsconfig.json` still includes
  test files for `tsc --noEmit`/typecheck. Without this split, `tsc` compiles
  `*.test.ts` into `dist/`, and Vitest picks up the compiled CommonJS
  `dist/*.test.js` alongside the real `src/*.test.ts`, failing immediately
  ("Vitest cannot be imported in a CommonJS module using require()").
- `tests/auth`'s `vitest.config.ts` loads `fake-indexeddb/auto` as a setup
  file: Firebase's Installations SDK (used internally by
  `httpsCallable`/Functions) needs IndexedDB, which only exists in real
  browser/React-Native environments, not plain Node — without the polyfill,
  every callable request from a Vitest/Node test fails. It also sets
  `testTimeout: 20000`: the _first_ callable request to a freshly-started
  Functions emulator has observed cold-start latency occasionally exceeding
  Vitest's 5s default even though the function itself finishes in the
  emulator's own logs in well under 50ms — a real Cloud Functions
  characteristic, not a hang.
- `apps/web/vitest.config.mts` (note the `.mts`, not `.ts` — same
  CJS-loader-warning fix as `eslint.config.mjs`) sets `resolve.alias` for
  `@` → `./src`: Vitest/Vite don't read `tsconfig.json`'s `"paths"` on their
  own, unlike Next.js itself.
- `apps/mobile/src/types/firebase-auth-rn.d.ts` is a small, deliberate
  ambient module augmentation for `getReactNativePersistence`. Confirmed by
  isolated `tsc` reproduction: `@firebase/auth`'s (and the `firebase`
  wrapper's) `"exports"` map hoists its `"types"` condition outside the
  `node`/`browser`/`react-native` branches, so bundler-mode TypeScript always
  types against the generic build and never sees RN-only exports —
  regardless of `customConditions: ["react-native"]` (already set by
  `expo/tsconfig.base`). Metro resolves the real react-native build
  correctly at runtime either way; this is a types-only gap, patched
  narrowly rather than worked around with a blanket `any`.
- `packages/firebase/src/appNative.ts` exists as a separate entrypoint from
  `app.ts` specifically because calling plain `getAuth(app)` (what `app.ts`
  does) implicitly creates a non-persistent Auth instance — and Firebase
  throws if `initializeAuth()` is called afterward on the same app. React
  Native's persistence-aware setup must run _first_, before anything else
  touches Auth on that app instance.

Phase 3 additions and gotchas:

- `packages/crypto/src/aead.ts` uses `@noble/ciphers` (`gcm()` from
  `@noble/ciphers/aes.js`) for AES-256-GCM — same pure-JS, zero-WASM,
  zero-native-module profile as `@noble/hashes`'s Argon2id, required because
  `apps/mobile` is plain Expo Go with no `expo prebuild`. Verified against
  the actual library source: `gcm(key, nonce).encrypt()` appends the auth tag
  to its output rather than returning it separately, matching
  `EncryptedEnvelope`'s real (tag-less) shape — see
  `docs/CRYPTOGRAPHIC_ARCHITECTURE.md` §3.
- The library only rejects nonces shorter than 8 bytes; it does **not**
  enforce our spec's exact 96-bit (12-byte) requirement. `aead.ts` checks
  `nonce.length === 12` explicitly on both the encrypt and decrypt paths —
  decrypt especially, since a tampered/malformed envelope could otherwise
  carry a wrong-length nonce through to the cipher.
- Base64 encode/decode (`bytesToBase64`/`base64ToBytes` in `aead.ts`) is a
  hand-rolled `btoa`/`atob` byte-loop wrapper, not a new dependency — neither
  `@noble/hashes` nor `@noble/ciphers` exports base64 (only hex). Confirmed
  Hermes has native `btoa`/`atob` since Expo SDK 51 (`apps/mobile` is on 57).
  Uses a byte-at-a-time loop, not `String.fromCharCode(...bytes)`, which
  risks a stack overflow on large inputs (relevant once attachments land in
  a later phase).
- This phase's crypto code initially shipped without new automated tests,
  per explicit direction for the initial Phase 3 landing — flagged
  deliberately as a gap, then closed as the immediate follow-up:
  `packages/crypto/src/aead.test.ts` covers round-trips and every
  fail-closed tamper path from `CRYPTOGRAPHIC_ARCHITECTURE.md` §11 (wrong
  key, modified tag/ciphertext, modified/short nonce, unknown version/alg,
  malformed base64, no partial-plaintext leakage on failure). The
  `VaultProvider` VEK wiring itself is covered indirectly but realistically:
  `tests/auth/authFlow.test.ts` exercises the same generate/wrap/fetch/
  unwrap sequence against the real Auth/Firestore/Functions emulators
  (including the wrong-password-fails-to-unwrap case), rather than
  mocking Firebase to render the React provider directly — consistent with
  this repo's existing pattern of testing business logic at the
  package/flow level, not through component rendering against a live
  backend.

## 4. Firebase Emulator Suite

Development and rule tests run against the local emulator, never production
Firebase, per build spec §44. The project is configured for the `demo-kryvex`
project ID (`.firebaserc`) — a `demo-*` ID the emulator suite treats as fully
offline, so no real GCP project or credentials are needed for any of this:

```bash
firebase emulators:start --only auth,firestore,storage,functions   # interactive, for manual testing
pnpm test:security                                                  # `firebase emulators:exec` + the rules test suite (tests/security)
```

`firebase.json` declares emulator ports (auth 9099, firestore 8080, storage
9199, functions 5001, ui 4000); `firebase/firestore.rules` and
`firebase/storage.rules` are the real, deployable rules (transcribed from
`docs/FIREBASE_SECURITY.md` §2–3).

`packages/firebase`'s `resolveFirebaseEmulatorConfig()` is a pure function
that decides _whether/where_ a client should point at the emulator, given
already-resolved env values — it does not itself call `initializeApp`/
`connectFirestoreEmulator`. Those calls (and picking the host automatically
based on environment) are Phase 2 work, once there's an actual Firebase app
config to initialize.

## 5. Environment variables

`.env.example` (committed) documents required variables, split explicitly per
build spec §45. Both apps need the same values under their own bundler's
public-env prefix — Next.js only inlines `NEXT_PUBLIC_*`, Expo only inlines
`EXPO_PUBLIC_*`:

```
# PUBLIC CONFIG (safe in the client bundle — Firebase web config is not a secret)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-kryvex
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true
NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=localhost

EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-kryvex
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost

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
