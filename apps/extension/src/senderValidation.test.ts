import { describe, expect, it } from "vitest";
import { validateContentSender } from "./senderValidation";

const valid = {
  extensionId: "extension-id",
  runtimeId: "extension-id",
  frameId: 0,
  tabId: 9,
  senderUrl: "https://accounts.example.com/sign-in",
  requestUrl: "https://accounts.example.com/next",
  allowLocalhostHttp: false,
} as const;

describe("validateContentSender", () => {
  it("accepts a top-frame request from the same exact origin", () => {
    expect(validateContentSender(valid)).toEqual({
      tabId: 9,
      url: valid.senderUrl,
    });
  });

  it("rejects subframes and stale or forged origins", () => {
    expect(() => validateContentSender({ ...valid, frameId: 2 })).toThrow();
    expect(() =>
      validateContentSender({
        ...valid,
        requestUrl: "https://other.example.com/sign-in",
      }),
    ).toThrow();
    expect(() =>
      validateContentSender({ ...valid, extensionId: "another-extension" }),
    ).toThrow();
  });

  it("rejects production HTTP pages", () => {
    expect(() =>
      validateContentSender({
        ...valid,
        senderUrl: "http://accounts.example.com/sign-in",
        requestUrl: "http://accounts.example.com/sign-in",
      }),
    ).toThrow();
  });
});
