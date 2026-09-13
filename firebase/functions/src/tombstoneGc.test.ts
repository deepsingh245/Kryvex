import { describe, expect, it } from "vitest";
import { retentionCutoff } from "./tombstoneGc";

// Only the pure date-math helper is unit-tested here — the real Admin SDK
// query/delete needs the emulator, same split getKdfParams.test.ts uses.

describe("retentionCutoff", () => {
  it("subtracts the default 30-day retention window", () => {
    const now = new Date("2026-06-30T00:00:00Z");
    const cutoff = retentionCutoff(now);
    expect(cutoff.toISOString()).toBe("2026-05-31T00:00:00.000Z");
  });

  it("supports a custom retention window", () => {
    const now = new Date("2026-06-30T00:00:00Z");
    const cutoff = retentionCutoff(now, 1);
    expect(cutoff.toISOString()).toBe("2026-06-29T00:00:00.000Z");
  });

  it("returns a date strictly before `now`", () => {
    const now = new Date();
    expect(retentionCutoff(now).getTime()).toBeLessThan(now.getTime());
  });
});
