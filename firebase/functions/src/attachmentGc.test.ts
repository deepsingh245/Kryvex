import { describe, expect, it } from "vitest";
import { storagePathsOf } from "./attachmentGc";

// Only the pure filtering helper is unit-tested here — the real Admin SDK
// query/Storage-delete/batch-delete needs the emulator, same split
// tombstoneGc.test.ts uses for retentionCutoff (reused by this module).

describe("storagePathsOf", () => {
  it("extracts storagePath from each doc", () => {
    const paths = storagePathsOf([
      { storagePath: "users/alice/attachments/a1" },
      { storagePath: "users/alice/attachments/a2" },
    ]);
    expect(paths).toEqual([
      "users/alice/attachments/a1",
      "users/alice/attachments/a2",
    ]);
  });

  it("skips docs missing storagePath", () => {
    const paths = storagePathsOf([
      { storagePath: "users/alice/attachments/a1" },
      {},
      { storagePath: undefined },
    ]);
    expect(paths).toEqual(["users/alice/attachments/a1"]);
  });

  it("returns an empty array for no docs", () => {
    expect(storagePathsOf([])).toEqual([]);
  });
});
