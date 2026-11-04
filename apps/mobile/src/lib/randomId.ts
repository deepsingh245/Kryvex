// Hermes may not expose crypto.randomUUID, so on mobile the fallback is the
// path that usually runs. It's CSPRNG-backed (getRandomValues, installed by
// src/polyfills.ts) — never Math.random(), even for a non-secret id, per
// CLAUDE.md's hard rule. Mirrors apps/web's randomIdFallback.
export function randomId(prefix: string): string {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${prefix}-${Date.now()}-${hex}`;
}
