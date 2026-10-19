import { parseOobCode } from "./recoveryLink";

describe("parseOobCode", () => {
  it("extracts the code from apps/web's confirm URL", () => {
    expect(
      parseOobCode("https://kryvex.app/recover/confirm?oobCode=abc-DEF_123"),
    ).toBe("abc-DEF_123");
  });

  it("extracts the top-level code from a Firebase action link", () => {
    const link =
      "https://kry-vex.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=XyZ987&apiKey=k&continueUrl=https%3A%2F%2Fkryvex.app%2Frecover%2Fconfirm%3FoobCode%3Devil&lang=en";
    expect(parseOobCode(link)).toBe("XyZ987");
  });

  it("accepts a bare code with surrounding whitespace", () => {
    expect(parseOobCode("  abc123  ")).toBe("abc123");
  });

  it("rejects empty input and links without a code", () => {
    expect(parseOobCode("")).toBeNull();
    expect(parseOobCode("https://kryvex.app/recover/confirm")).toBeNull();
  });
});
