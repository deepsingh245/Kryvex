import { describe, expect, it } from "vitest";
import { loginWebsiteMatchesOrigin, normalizeLoginOrigin } from "./loginOrigin";

describe("normalizeLoginOrigin", () => {
  it("keeps only a canonical HTTPS origin", () => {
    expect(
      normalizeLoginOrigin("https://Example.COM:443/private?q=secret#part"),
    ).toEqual({ origin: "https://example.com", hostname: "example.com" });
  });

  it("normalizes a bare hostname and preserves a non-default port", () => {
    expect(normalizeLoginOrigin("login.example.com:8443/path")).toEqual({
      origin: "https://login.example.com:8443",
      hostname: "login.example.com",
    });
  });

  it("rejects HTTP except for an explicit localhost development build", () => {
    expect(normalizeLoginOrigin("http://example.com/login")).toBeNull();
    expect(normalizeLoginOrigin("http://localhost:4173/login")).toBeNull();
    expect(
      normalizeLoginOrigin("http://localhost:4173/login", {
        allowLocalhostHttp: true,
      }),
    ).toEqual({ origin: "http://localhost:4173", hostname: "localhost" });
  });

  it("rejects embedded URL credentials", () => {
    expect(normalizeLoginOrigin("https://user:pass@example.com")).toBeNull();
  });
});

describe("loginWebsiteMatchesOrigin", () => {
  it("matches the exact hostname, including legacy bare-host entries", () => {
    expect(
      loginWebsiteMatchesOrigin(
        ["example.com", "https://other.example"],
        "https://example.com/login",
      ),
    ).toBe(true);
  });

  it("does not share credentials with sibling or child subdomains", () => {
    expect(
      loginWebsiteMatchesOrigin(
        ["https://accounts.example.com"],
        "https://app.example.com/login",
      ),
    ).toBe(false);
    expect(
      loginWebsiteMatchesOrigin(
        ["https://example.com"],
        "https://login.example.com",
      ),
    ).toBe(false);
  });

  it("does not match an unsafe current URL", () => {
    expect(
      loginWebsiteMatchesOrigin(["https://example.com"], "http://example.com"),
    ).toBe(false);
  });
});
