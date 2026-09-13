import { generateKey } from "@kryvex/crypto";
import { describe, expect, it } from "vitest";
import { formatRecoveryKey, parseRecoveryKey } from "./recoveryKey";

const INVALID_MESSAGE = "Invalid recovery key.";

describe("formatRecoveryKey / parseRecoveryKey round-trip", () => {
  it("round-trips a generated key", () => {
    const key = generateKey();
    const formatted = formatRecoveryKey(key);
    expect(parseRecoveryKey(formatted)).toEqual(key);
  });

  it("formats as uppercase hex in dash-separated groups of 4", () => {
    const formatted = formatRecoveryKey(generateKey());
    expect(formatted).toMatch(/^[0-9A-F]{4}(-[0-9A-F]{4}){15}$/);
  });

  it("tolerates lowercase, extra whitespace, and re-typed dashes on parse", () => {
    const key = generateKey();
    const formatted = formatRecoveryKey(key);
    const messy = `  ${formatted.toLowerCase().replace(/-/g, " - ")}  `;
    expect(parseRecoveryKey(messy)).toEqual(key);
  });
});

describe("parseRecoveryKey — fail-closed on malformed input", () => {
  it("rejects a too-short input", () => {
    expect(() => parseRecoveryKey("AB12-CD34")).toThrow(INVALID_MESSAGE);
  });

  it("rejects non-hex characters", () => {
    const formatted = formatRecoveryKey(generateKey());
    const withGarbage = "ZZZZ" + formatted.slice(4);
    expect(() => parseRecoveryKey(withGarbage)).toThrow(INVALID_MESSAGE);
  });

  it("rejects an empty string", () => {
    expect(() => parseRecoveryKey("")).toThrow(INVALID_MESSAGE);
  });
});
