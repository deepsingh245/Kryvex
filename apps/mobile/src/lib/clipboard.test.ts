import { clearCopiedSecret, copySecret } from "./clipboard";

jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));

function fakeClipboard(initial = "") {
  let contents = initial;
  return {
    io: {
      write: jest.fn(async (text: string) => {
        contents = text;
      }),
      read: jest.fn(async () => contents),
    },
    get contents() {
      return contents;
    },
    set contents(value: string) {
      contents = value;
    },
  };
}

describe("copySecret", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("clears the clipboard after the configured delay", async () => {
    const cb = fakeClipboard();
    await copySecret("hunter2", 30, cb.io);
    expect(cb.contents).toBe("hunter2");
    await jest.advanceTimersByTimeAsync(30_000);
    expect(cb.contents).toBe("");
  });

  it("leaves the clipboard alone if the user copied something else", async () => {
    const cb = fakeClipboard();
    await copySecret("hunter2", 30, cb.io);
    cb.contents = "grocery list";
    await jest.advanceTimersByTimeAsync(30_000);
    expect(cb.contents).toBe("grocery list");
  });
});

describe("clearCopiedSecret", () => {
  it("clears only the last vault copy, once", async () => {
    const cb = fakeClipboard();
    await copySecret("hunter2", 60, cb.io);
    await clearCopiedSecret(cb.io);
    expect(cb.contents).toBe("");

    cb.contents = "unrelated";
    await clearCopiedSecret(cb.io);
    expect(cb.contents).toBe("unrelated");
  });

  it("doesn't clear unrelated clipboard content", async () => {
    const cb = fakeClipboard();
    await copySecret("hunter2", 60, cb.io);
    cb.contents = "unrelated";
    await clearCopiedSecret(cb.io);
    expect(cb.contents).toBe("unrelated");
  });
});
