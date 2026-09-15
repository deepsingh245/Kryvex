# Kryvex — Deployment

Status: Phase 0 draft; executed starting Phase 10 (Release), referenced
earlier only for planning. See also: [FIREBASE_SECURITY.md](./FIREBASE_SECURITY.md).

## 1. Environments

- **Local**: Firebase Emulator Suite (auth, firestore, storage, functions) —
  all day-to-day development and automated tests.
- **Staging** (optional, added when useful): a separate Firebase project,
  same rules/functions, used for pre-release verification against real
  Firebase infrastructure without touching production user data.
- **Production**: the live Firebase project backing the released web and
  mobile apps.

Web/mobile clients select their target purely via environment configuration
(`.env`/build profile) — no code branches on "which environment am I," to
avoid accidentally shipping emulator-pointing code to production.

## 2. Firebase deployment

```bash
firebase deploy --only firestore:rules   # after any firestore.rules change + emulator tests pass
firebase deploy --only storage:rules     # after any storage.rules change + emulator tests pass
firebase deploy --only functions         # after Cloud Functions changes
```

Rules and functions are only deployed after the corresponding emulator-based
security tests (FIREBASE_SECURITY.md §7) pass in CI. Rules changes are treated
with the same care as the code they gate — reviewed for the ownership/
default-deny invariants before deploy, never deployed straight from a local
uncommitted edit.

## 3. Web deployment

- Firebase Hosting (keeps the whole stack in one platform) or Vercel — final
  choice made in Phase 1 based on Next.js feature needs (ISR, edge functions)
  at that time; either way, the app is a standard Next.js production build
  (`pnpm build` at the `apps/web` workspace).
- Security headers (build spec §39: CSP, HSTS, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy, frame protections) are configured at
  the hosting layer and verified before each release; CSP exceptions, if any,
  are documented inline in the hosting config with a reason.

## 4. Mobile deployment

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

## 5. CI

- Lint, typecheck, unit tests, and Firestore/Storage rule tests run on every
  PR (build spec §44/§68 workflow).
- CodeQL / dependency review runs on every PR touching dependencies (build
  spec §40).
- Production Firebase deploys and app-store submissions are manual/gated
  steps, never triggered automatically by merging to the main branch, given
  the sensitivity of rules/functions changes.

## 6. Release checklist (Phase 10)

- [ ] Production Firebase project provisioned, rules/functions deployed and
      re-verified against the emulator test suite one more time against the
      exact rules being deployed.
- [ ] Provision a reCAPTCHA v3 site key in Firebase Console and set
      `NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY` for the production web
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
- [ ] Web security headers verified in the deployed environment (not just
      locally).
- [ ] iOS/Android builds signed, tested on physical devices for biometric
      unlock, auto-lock, and clipboard behavior (build spec §71 — do not fake
      security: if a platform feature isn't actually working, it is not
      claimed as shipped).
- [ ] Privacy policy and terms published, accurately describing the
      zero-knowledge model and its limits (SECURITY_THREAT_MODEL.md §5) —
      no "unhackable"/"military-grade" language anywhere.
- [ ] `KRYVEX_SOURCE_OF_TRUTH.md` reflects the as-shipped architecture.
