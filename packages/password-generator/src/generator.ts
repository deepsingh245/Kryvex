/**
 * CSPRNG-based password generator — build spec §11,
 * docs/SECURITY_THREAT_MODEL.md §7 ("never Math.random() for anything
 * security-sensitive"). Uses @noble/hashes's randomBytes, the same RNG
 * source @kryvex/crypto's aead.ts uses for key/nonce generation, for
 * consistency across the codebase.
 */

import { randomBytes } from "@noble/hashes/utils.js";

const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?";
// Characters easily confused with each other in most fonts.
const AMBIGUOUS = new Set("0O1lI|");

export interface GeneratePasswordOptions {
  length: number;
  includeLowercase: boolean;
  includeUppercase: boolean;
  includeDigits: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

export const DEFAULT_GENERATOR_OPTIONS: GeneratePasswordOptions = {
  length: 20,
  includeLowercase: true,
  includeUppercase: true,
  includeDigits: true,
  includeSymbols: true,
  excludeAmbiguous: false,
};

/**
 * Unbiased index in [0, max) drawn from a single random byte via rejection
 * sampling. `randomBytes(1)[0] % max` is subtly biased whenever 256 isn't
 * evenly divisible by `max` (true for almost every charset length here) —
 * indices below the remainder would be drawn slightly more often. Rejecting
 * bytes outside the largest range evenly divisible by `max` and redrawing
 * removes that bias.
 */
function randomIndex(max: number): number {
  if (max <= 0 || max > 256) {
    throw new Error("randomIndex: max must be between 1 and 256.");
  }
  const limit = 256 - (256 % max);
  let byte: number;
  do {
    byte = randomBytes(1)[0]!;
  } while (byte >= limit);
  return byte % max;
}

function buildCharset(options: GeneratePasswordOptions): string {
  let charset = "";
  if (options.includeLowercase) charset += LOWERCASE;
  if (options.includeUppercase) charset += UPPERCASE;
  if (options.includeDigits) charset += DIGITS;
  if (options.includeSymbols) charset += SYMBOLS;
  if (options.excludeAmbiguous) {
    charset = Array.from(charset)
      .filter((c) => !AMBIGUOUS.has(c))
      .join("");
  }
  return charset;
}

export function generatePassword(
  options: GeneratePasswordOptions = DEFAULT_GENERATOR_OPTIONS,
): string {
  const charset = buildCharset(options);
  if (charset.length === 0) {
    throw new Error(
      "generatePassword: at least one character set must be enabled.",
    );
  }
  let password = "";
  for (let i = 0; i < options.length; i++) {
    password += charset[randomIndex(charset.length)];
  }
  return password;
}
