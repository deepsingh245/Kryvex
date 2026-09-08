import { describe, expect, it } from "vitest";
import { autoLock, clipboard, secureLogger } from "./index";

describe("@kryvex/security placeholder exports", () => {
  it("exposes the real secureLogger", () => {
    expect(secureLogger).toBeDefined();
  });

  it("autoLock is a Phase 7 placeholder", () => {
    expect(() => autoLock.notYetImplemented("configure")).toThrowError(
      /Phase 7/,
    );
  });

  it("clipboard is a Phase 7 placeholder", () => {
    expect(() => clipboard.notYetImplemented("clear")).toThrowError(/Phase 7/);
  });
});
