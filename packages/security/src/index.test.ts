import { describe, expect, it } from "vitest";
import { autoLock, clipboard, secureLogger } from "./index";

describe("@kryvex/security exports", () => {
  it("exposes the real secureLogger", () => {
    expect(secureLogger).toBeDefined();
  });

  it("exposes the real autoLock.createInactivityTimer", () => {
    expect(autoLock.createInactivityTimer).toBeDefined();
  });

  it("exposes the real clipboard.copyWithAutoClear", () => {
    expect(clipboard.copyWithAutoClear).toBeDefined();
  });
});
