import { describe, expect, it } from "vitest";
import {
  DEFAULT_GENERATOR_OPTIONS,
  generatePassword,
  type GeneratePasswordOptions,
} from "./generator";

const LOWER = /[a-z]/;
const UPPER = /[A-Z]/;
const DIGIT = /[0-9]/;
const SYMBOL = /[!@#$%^&*()\-_=+[\]{};:,.<>?]/;
const AMBIGUOUS = /[0O1lI|]/;

function options(
  overrides: Partial<GeneratePasswordOptions>,
): GeneratePasswordOptions {
  return { ...DEFAULT_GENERATOR_OPTIONS, ...overrides };
}

describe("generatePassword — length", () => {
  it("produces a password of the requested length", () => {
    for (const length of [8, 20, 64, 128]) {
      expect(generatePassword(options({ length })).length).toBe(length);
    }
  });

  it("is not deterministic across calls", () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});

describe("generatePassword — charset membership", () => {
  it("draws only from lowercase when it is the only enabled set", () => {
    const password = generatePassword(
      options({
        length: 50,
        includeLowercase: true,
        includeUppercase: false,
        includeDigits: false,
        includeSymbols: false,
      }),
    );
    expect(password).toMatch(/^[a-z]+$/);
  });

  it("draws only from digits when it is the only enabled set", () => {
    const password = generatePassword(
      options({
        length: 50,
        includeLowercase: false,
        includeUppercase: false,
        includeDigits: true,
        includeSymbols: false,
      }),
    );
    expect(password).toMatch(/^[0-9]+$/);
  });

  it("draws only from symbols when it is the only enabled set", () => {
    const password = generatePassword(
      options({
        length: 50,
        includeLowercase: false,
        includeUppercase: false,
        includeDigits: false,
        includeSymbols: true,
      }),
    );
    expect(password).toMatch(new RegExp(`^${SYMBOL.source}+$`));
  });

  it("with all sets enabled, a long password exercises every set (probabilistically)", () => {
    const password = generatePassword(options({ length: 200 }));
    expect(LOWER.test(password)).toBe(true);
    expect(UPPER.test(password)).toBe(true);
    expect(DIGIT.test(password)).toBe(true);
    expect(SYMBOL.test(password)).toBe(true);
  });
});

describe("generatePassword — excludeAmbiguous", () => {
  it("never includes ambiguous characters when enabled", () => {
    const password = generatePassword(
      options({ length: 300, excludeAmbiguous: true }),
    );
    expect(AMBIGUOUS.test(password)).toBe(false);
  });
});

describe("generatePassword — validation", () => {
  it("throws when every character set is disabled", () => {
    expect(() =>
      generatePassword(
        options({
          includeLowercase: false,
          includeUppercase: false,
          includeDigits: false,
          includeSymbols: false,
        }),
      ),
    ).toThrow();
  });
});

describe("generatePassword — statistical sanity", () => {
  it("draws roughly evenly from a small enabled charset over many samples", () => {
    // Digits only (10 chars), one long password — every digit should
    // appear a roughly similar number of times. Wide tolerance to avoid
    // flakiness: this is a sanity check for gross bias, not a strict RNG test.
    const password = generatePassword(
      options({
        length: 5000,
        includeLowercase: false,
        includeUppercase: false,
        includeDigits: true,
        includeSymbols: false,
      }),
    );
    const counts = new Map<string, number>();
    for (const char of password) {
      counts.set(char, (counts.get(char) ?? 0) + 1);
    }
    expect(counts.size).toBe(10);
    const expected = password.length / 10;
    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(expected * 0.5);
      expect(count).toBeLessThan(expected * 1.5);
    }
  });
});
