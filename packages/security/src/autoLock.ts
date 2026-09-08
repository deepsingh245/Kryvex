/**
 * Phase 1 scaffold only. Real auto-lock timers (build spec §19: lock on
 * background/inactivity/explicit lock/session expiry) land in Phase 7.
 */

export function notYetImplemented(feature: string): never {
  throw new Error(
    `@kryvex/security/autoLock: "${feature}" is not implemented until Phase 7`,
  );
}
