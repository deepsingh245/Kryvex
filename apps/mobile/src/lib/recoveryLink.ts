// Firebase oobCodes are URL-safe base64-ish tokens.
const BARE_CODE = /^[A-Za-z0-9_-]+$/;
// Regex rather than URL/URLSearchParams: React Native's URLSearchParams
// doesn't implement get(). The Firebase action link's own continueUrl is
// percent-encoded, so the first top-level oobCode match is the right one.
const OOB_PARAM = /[?&]oobCode=([^&#\s]+)/;

/**
 * Extracts the oobCode from a pasted recovery-email link (Firebase action
 * link or apps/web's /recover/confirm?oobCode=… URL), or accepts a bare
 * code. Returns null if nothing usable was pasted.
 */
export function parseOobCode(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const match = OOB_PARAM.exec(trimmed);
  if (match?.[1]) {
    try {
      const code = decodeURIComponent(match[1]);
      return BARE_CODE.test(code) ? code : null;
    } catch {
      return null;
    }
  }
  return BARE_CODE.test(trimmed) ? trimmed : null;
}
