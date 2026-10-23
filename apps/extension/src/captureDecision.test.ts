import { describe, expect, it } from "vitest";
import { decideCapture, mergeCapturedLogin } from "./captureDecision";

describe("decideCapture", () => {
  it("offers Save for a new hostname and username pair", () => {
    expect(decideCapture("new-password", [])).toBe("save");
  });

  it("suppresses a duplicate password", () => {
    expect(decideCapture("same-password", ["same-password"])).toBe("unchanged");
  });

  it("offers Update for one changed match", () => {
    expect(decideCapture("changed-password", ["old-password"])).toBe("update");
  });

  it("requires a choice when several records match", () => {
    expect(decideCapture("changed-password", ["one", "two"])).toBe("choose");
  });
});

describe("mergeCapturedLogin", () => {
  const existing = {
    type: "login" as const,
    title: "Personal account",
    username: "saved@example.com",
    password: "old-password",
    websites: ["https://accounts.example.com"],
    notes: "Kept locally",
    customFields: [
      {
        id: "field-1",
        label: "Account",
        type: "text" as const,
        value: "primary",
      },
    ],
    tags: ["important"],
  };

  it("updates credentials without discarding existing metadata", () => {
    expect(
      mergeCapturedLogin(existing, {
        ...existing,
        title: "accounts.example.com",
        username: "new@example.com",
        password: "new-password",
        notes: "",
        tags: [],
      }),
    ).toEqual({
      ...existing,
      username: "new@example.com",
      password: "new-password",
    });
  });

  it("keeps the stored username for password-change forms without one", () => {
    expect(
      mergeCapturedLogin(existing, {
        ...existing,
        username: "",
        password: "new-password",
      }).username,
    ).toBe("saved@example.com");
  });
});
