import { describe, expect, it } from "vitest";
import { ping } from "./index";

describe("ping", () => {
  it("returns a trivial ok response", async () => {
    // `.run()` is onCall's public unit-test entry point; casting the request
    // avoids reconstructing the full CallableRequest/rawRequest shape for a
    // handler that ignores its input entirely.
    const result = await ping.run({
      data: {},
      auth: undefined,
    } as unknown as Parameters<typeof ping.run>[0]);
    expect(result).toEqual({ ok: true, phase: 1 });
  });
});
