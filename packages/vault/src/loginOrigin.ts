export interface NormalizedLoginOrigin {
  origin: string;
  hostname: string;
}

export interface NormalizeLoginOriginOptions {
  /** Development-only escape hatch. Production callers must leave this false. */
  allowLocalhostHttp?: boolean;
}

function isLocalDevelopmentHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

function toUrlCandidate(value: string): string {
  const trimmed = value.trim();
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

/**
 * Converts a page URL or user-entered website into the canonical origin used
 * by browser autofill. Paths, queries, fragments, credentials, and trailing
 * dots never participate in matching or storage.
 */
export function normalizeLoginOrigin(
  value: string,
  options: NormalizeLoginOriginOptions = {},
): NormalizedLoginOrigin | null {
  try {
    const parsed = new URL(toUrlCandidate(value));
    const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
    const allowedProtocol =
      parsed.protocol === "https:" ||
      (options.allowLocalhostHttp === true &&
        parsed.protocol === "http:" &&
        isLocalDevelopmentHost(hostname));

    if (!allowedProtocol || !hostname || parsed.username || parsed.password) {
      return null;
    }

    const defaultPort =
      (parsed.protocol === "https:" && parsed.port === "443") ||
      (parsed.protocol === "http:" && parsed.port === "80");
    const port = parsed.port && !defaultPort ? `:${parsed.port}` : "";
    return {
      origin: `${parsed.protocol}//${hostname}${port}`,
      hostname,
    };
  } catch {
    return null;
  }
}

/** Exact-hostname matching: ports and paths do not widen or narrow trust. */
export function loginWebsiteMatchesOrigin(
  websites: readonly string[],
  currentUrl: string,
  options: NormalizeLoginOriginOptions = {},
): boolean {
  const current = normalizeLoginOrigin(currentUrl, options);
  if (!current) return false;

  return websites.some((website) => {
    const saved = normalizeLoginOrigin(website, options);
    return saved?.hostname === current.hostname;
  });
}
