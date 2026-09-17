# Kryvex — Deployment

Status: Firestore rules, Storage rules, and Cloud Functions are
code-complete, pass the emulator-based security/auth test suites (see
`pnpm test:security`/`pnpm test:auth`), and are deployed to the real
Firebase project. Web Hosting (Firebase Hosting's Next.js framework
integration — the "Firebase Hosting or Vercel" choice flagged as TBD in
earlier drafts of this doc is now decided, so the whole stack stays on one
platform) is being set up now too — see §6. No `production` alias in
`.firebaserc` yet (deliberately deferred — see §3); deploy commands below
pass `--project <your-project-id>` explicitly instead. See also:
[FIREBASE_SECURITY.md](./FIREBASE_SECURITY.md).

## 1. Environments

- **Local**: Firebase Emulator Suite (auth, firestore, storage, functions),
  project alias `demo-kryvex` — all day-to-day development and automated
  tests. This is what `.firebaserc`'s `"default"` alias and
  `apps/web/.env.local`'s `NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true` point at
  today.
- **Staging** (optional, added when useful): a separate real Firebase
  project, same rules/functions, used for pre-release verification without
  touching production user data.
- **Production**: the real Firebase project already provisioned in the
  Firebase Console — including its default Firestore database — referenced
  in this doc as `<your-project-id>` (see §3). Not yet aliased in
  `.firebaserc`; today's deploys target it via an explicit `--project`
  flag instead.

Web/mobile clients select their target purely via environment configuration
(`.env`/build profile) — no code branches on "which environment am I," to
avoid accidentally shipping emulator-pointing code to production.

## 2. Prerequisites (this device)

- Node.js ≥ 22.13.0 and pnpm 12.3.4 (`packageManager` in the root
  `package.json` — `corepack enable` will pick this up automatically).
- A Google account that already has at least **Editor** access on the
  existing Firebase project in the Console — the project itself doesn't
  need to be created, just linked from this machine.
- The Firebase CLI. It isn't a repo dependency (checked deliberately — no
  `firebase-tools` in any `package.json`), so install it globally:
  ```bash
  npm install -g firebase-tools
  firebase --version   # needs to be recent enough for Next.js Hosting
                        # framework support — 13.x or newer; if it's old,
                        # re-run the install command above to update
  ```
  (`pnpm dlx firebase-tools@latest <command>` also works per-command
  without a global install, if preferred.)
- **Windows only**, for the Hosting deploy (§6): `esbuild` and `which`,
  both globally:
  ```bash
  npm install -g which
  npm install -g esbuild@0.19.12
  ```
  Firebase's Next.js bundler locates `esbuild` via `npx which esbuild`,
  which fails outright on Windows without a `which` shim (`'node-which' is
  not recognized...`) — and its fallback for "esbuild not found" is an
  ad-hoc `npm install esbuild --no-save` run directly in whatever
  directory the tool happens to be in, which fails too: every
  `package.json` in this pnpm-catalog monorepo (root included) has
  `workspace:*`/`catalog:` entries plain `npm` can't parse, even for an
  unrelated ad-hoc install. Installing both globally makes the tool find
  them directly and never reach that broken fallback at all. Not needed
  on macOS/Linux, where `which` is already a shell builtin.

## 3. One-time device setup

1. Authenticate the CLI with the Google account from §2:
   ```bash
   firebase login
   ```
2. Confirm it can see the existing project, and note its exact project ID
   (this is `<your-project-id>` everywhere below):
   ```bash
   firebase projects:list
   ```
3. That's it for now — deliberately **not** running `firebase use --add`
   yet. `.firebaserc` today only has the `demo-kryvex` emulator alias, and
   adding a `production` alias is a separate, later step (it also gets
   committed, since `.firebaserc` is tracked in git, so it shouldn't be
   added casually). Every deploy command below passes an explicit
   `--project <your-project-id>` instead — this also means a stray
   `firebase deploy` run without that flag can't accidentally hit the real
   project, since there's no default pointing at it yet.

## 4. Environment variables (production web build)

`apps/web/.env.local` on this device currently points at the emulator
(`NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-kryvex`,
`NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true`) — correct for local dev, wrong for
a production build. Create `apps/web/.env.production.local` (already
covered by the repo's `.gitignore` `.env*.local` pattern, so this never
gets committed) with the real project's values, all read in
`apps/web/src/lib/firebaseConfig.ts`:

| Variable | Where to get it |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Console → Project Settings → General → Your apps → Web app → SDK config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | same SDK config block |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | same SDK config block (the real project ID, not `demo-kryvex`) |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | same SDK config block |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | same SDK config block |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` | set to `false` (or omit) |
| `NEXT_PUBLIC_FIREBASE_EMULATOR_HOST` | omit — only used in emulator mode |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` | Firebase Console → App Check → your web app → reCAPTCHA v3 site key (provision one first if it doesn't exist yet — see §8's checklist item; the client wiring is already in place and simply stays inert without this) |

If the Console doesn't show a web app under this project yet, add one first
(Project Settings → General → "Add app" → Web) — that's what generates the
SDK config block above.

## 5. Deploying Firestore, Functions, and Storage

In this order — Firestore first, then Functions, then Storage:

```bash
# 1. Firestore — rules + indexes, deploys to the project's existing
#    default database automatically (nothing extra to configure for
#    that — firebase.json's firestore block has no database name, so it
#    always targets "(default)")
firebase deploy --only firestore --project <your-project-id>

# 2. Cloud Functions — ping, getKdfParams, getRecoveryEnvelope,
#    tombstoneGc, attachmentGc (firebase/functions/src/index.ts).
#    firebase.json's predeploy hook (pnpm --dir functions build) runs
#    automatically first, no manual build step needed.
#    Gotcha already hit and fixed once: Cloud Build's remote npm install
#    (which sets up this function's node_modules inside its own build
#    container) runs against firebase/functions/package.json's *entire*
#    dependencies+devDependencies list, not just dependencies — and plain
#    npm can't resolve pnpm's `workspace:*`/`catalog:` protocols at all,
#    failing with EUNSUPPORTEDPROTOCOL. So firebase/functions/package.json
#    can't reference any @kryvex/* workspace package or a "catalog:"
#    version, full stop — every version there is a real, pinned npm
#    semver instead, and the one type-only cross-package import that used
#    to exist (UserProfileDocument from @kryvex/types) was replaced with a
#    small hand-synced local mirror (src/userProfileShape.ts) rather than
#    a package.json dependency at all.
firebase deploy --only functions --project <your-project-id>

# 3. Storage rules — plain `--only storage`, NOT `--only storage:rules`.
#    Unlike `firestore:rules`/`firestore:indexes` (where the colon suffix
#    picks a resource *type*), storage's colon suffix picks a named
#    *bucket target* (set up via `firebase target:apply storage <name>
#    <bucket>` for multi-bucket projects) — "rules" isn't a configured
#    target, so `--only storage:rules` fails with "Could not find rules
#    for the following storage targets: rules" even though the rules file
#    and bucket are both fine. `--only storage` always means "this
#    project's one storage.rules file" for a single-bucket project like
#    this one.
firebase deploy --only storage --project <your-project-id>
```

Storage also doesn't come with a default bucket automatically the way
Firestore's default database does — it's a separate product needing its
own one-time setup. If step 3 ever fails with "Could not find the default
bucket" (a different error from the one above), the bucket hasn't been
provisioned yet: open the Firebase Console → the project → **Storage** →
**Get started** (any region; the rules mode picked there doesn't matter,
since this deploy immediately overwrites it with `firebase/storage.rules`).

Rules and functions are only deployed after the corresponding
emulator-based tests (`pnpm test:security`, `pnpm test:auth`) pass. Rules
changes are treated with the same care as the code they gate — reviewed
for the ownership/default-deny invariants before deploy, never deployed
straight from a local uncommitted edit.

Doing these three separately (rather than one `firebase deploy` with no
`--only`) is deliberate for this first deploy — it's easier to confirm
each one individually in the Console (§8) before moving to the next.

## 6. Deploying the web app (Firebase Hosting)

`firebase.json` needs a `hosting` entry (Firebase's Next.js framework
integration detects the App Router build and provisions the SSR backend —
Cloud Functions/Cloud Run — for you; this is not a static export):

```json
{
  "hosting": {
    "source": "apps/web"
  }
}
```

One-time CLI setup on this device (a local CLI config flag, not a repo or
project setting — needed on every machine that runs this deploy): Next.js
Hosting support is still behind an experiment flag, so a bare
`firebase deploy --only hosting` fails with "Cannot deploy a web framework
from source because the experiment webframeworks is not enabled" until you
run:

```bash
firebase experiments:enable webframeworks
```

Then, with the production values from §4 in
`apps/web/.env.production.local`:

```bash
firebase deploy --only hosting --project <your-project-id>
```

This builds `apps/web` (`pnpm build` under the hood) and deploys it — the
CLI prints the live Hosting URL when it finishes. Security headers (CSP,
HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame
protections — build spec §39) are configured via `firebase.json`'s
`hosting.headers` and verified against the deployed URL before each
release, not just locally; any CSP exception is documented inline with a
reason.

## 7. Deploying everything at once (once Hosting is set up too)

Later, once §6's `hosting` entry exists in `firebase.json` and a
`production` alias has been added (§3, deferred for now):

```bash
firebase deploy --project production
```

deploys every configured target (`firestore`, `storage`, `functions`,
`hosting`) in one pass. Prefer the scoped `--only` commands in §5/§6 for a
routine single-area change — `firebase deploy` with no `--only` is for a
coordinated release, not a quick rules tweak. Today, with no `hosting`
entry yet, `firebase deploy --project <your-project-id>` (no `--only`)
would already cover the same three targets as §5's three commands
combined — running them separately is just for clearer confirmation on
this first deploy.

## 8. Verifying a deploy

- `firebase deploy` (and each `--only` variant) prints a Console link —
  open it and confirm nothing errored.
- `firebase functions:list --project <your-project-id>` — confirms all
  five functions are present and their trigger types match expectations.
- Firebase Console → Firestore/Storage → Rules tab — confirms the deployed
  rules text matches `firebase/firestore.rules`/`firebase/storage.rules`.
- Once Hosting is set up (§6, later): sign up / sign in against the real
  deployed URL once, end to end, before calling a release done — the
  emulator suite passing doesn't guarantee the real project's Auth/App
  Check configuration (§4, §10) is also correct.

## 9. Mobile deployment

- **Build tooling**: Expo Application Services (EAS Build) for both iOS and
  Android, given the Expo/React Native stack chosen in ARCHITECTURE.md.
- **iOS**: EAS Build → TestFlight for internal/beta testing → App Store
  submission. Requires Apple Developer account, app icons, splash screens,
  and privacy nutrition label reflecting actual data handling (per
  SECURITY_THREAT_MODEL.md — accurate, not maximally reassuring, disclosure).
- **Android**: EAS Build → internal testing track → Play Store submission.
  Requires a Play Console account, Play Data Safety form filled out to match
  actual behavior.
- Biometric/secure-storage entitlements (Keychain access groups, Keystore)
  are configured per build spec §58 as part of the native build profile, not
  left to default Expo config.

## 10. CI

- Lint, typecheck, unit tests, and Firestore/Storage rule tests run on every
  PR (build spec §44/§68 workflow).
- CodeQL / dependency review runs on every PR touching dependencies (build
  spec §40).
- Production Firebase deploys and app-store submissions are manual/gated
  steps, never triggered automatically by merging to the main branch, given
  the sensitivity of rules/functions changes.

## 11. Release checklist (Phase 10)

- [ ] Real Firebase project linked on the release device (§3), rules/
      functions/hosting deployed (§5–§7) and re-verified against the
      emulator test suite one more time against the exact rules being
      deployed.
- [ ] Provision a reCAPTCHA v3 site key in Firebase Console and set
      `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` (§4) for the production web
      deploy (Phase 9w wired the client-side code; it's inert without a
      real key — see `docs/FIREBASE_SECURITY.md` §4).
- [ ] App Check enforcement (`enforceAppCheck: true`) turned on for
      `getKdfParams`/`getRecoveryEnvelope` — only once `apps/mobile` also
      has App Check wired (Play Integrity/App Attest), or mobile sign-up/
      sign-in/recovery will start failing.
- [ ] Firebase Auth's **Email Enumeration Protection** project setting
      enabled (Identity Platform) — not turned on by default, and not
      something code changes; may have cost/behavior implications the
      project owner should confirm before enabling. See
      `docs/SECURITY_THREAT_MODEL.md` §4 item #25.
- [ ] Web security headers verified in the deployed environment (§6, §8 —
      not just locally).
- [ ] iOS/Android builds signed, tested on physical devices for biometric
      unlock, auto-lock, and clipboard behavior (build spec §71 — do not fake
      security: if a platform feature isn't actually working, it is not
      claimed as shipped).
- [ ] Privacy policy and terms published, accurately describing the
      zero-knowledge model and its limits (SECURITY_THREAT_MODEL.md §5) —
      no "unhackable"/"military-grade" language anywhere.
- [ ] `KRYVEX_SOURCE_OF_TRUTH.md` reflects the as-shipped architecture.
