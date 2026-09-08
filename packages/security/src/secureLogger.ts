/**
 * The only sanctioned path to console.* in the Kryvex codebase (build spec
 * §38, docs/DEVELOPMENT.md §6). Application code must call secureLogger.*
 * instead of console.* directly — enforced by the `no-console` ESLint rule
 * in every other package/app (see ../eslint.config.js).
 *
 * This does not make arbitrary logging "safe" by itself: callers must still
 * not pass whole vault items or master passwords. What it adds is a
 * best-effort safety net — known-sensitive key names are redacted before
 * anything reaches the console, so a mistake (e.g. accidentally logging a
 * decrypted item) fails safe instead of leaking a secret verbatim.
 */

const SENSITIVE_KEY_PATTERN =
  /password|master.?key|vault.?key|secret|token|ciphertext|cvv|pin\b|recoverykey|apikey/i;

function redact(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return "[CIRCULAR]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => redact(item, seen));
  }

  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    output[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? "[REDACTED]"
      : redact(val, seen);
  }
  return output;
}

function format(args: unknown[]): unknown[] {
  return args.map((arg) => redact(arg));
}

// no-console is disabled for this package only (see ./eslint.config.js) —
// this module IS the sanctioned console boundary every other package calls into.
export const secureLogger = {
  info(message: string, ...meta: unknown[]): void {
    console.info(message, ...format(meta));
  },
  warn(message: string, ...meta: unknown[]): void {
    console.warn(message, ...format(meta));
  },
  error(message: string, ...meta: unknown[]): void {
    console.error(message, ...format(meta));
  },
};
