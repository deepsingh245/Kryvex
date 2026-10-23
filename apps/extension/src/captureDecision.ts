import type { LoginContent } from "@kryvex/types";

export type CaptureDecision = "unchanged" | "save" | "update" | "choose";

/**
 * Decides which prompt, if any, is appropriate for exact-hostname/account
 * matches. Password values are used only for this in-memory comparison.
 */
export function decideCapture(
  capturedPassword: string,
  matchingPasswords: readonly string[],
): CaptureDecision {
  if (matchingPasswords.includes(capturedPassword)) return "unchanged";
  if (matchingPasswords.length === 0) return "save";
  if (matchingPasswords.length === 1) return "update";
  return "choose";
}

/**
 * Applies a captured password to an existing login without replacing the
 * user's title, tags, websites, custom fields, or other saved metadata.
 */
export function mergeCapturedLogin(
  existing: LoginContent,
  captured: LoginContent,
): LoginContent {
  return {
    ...existing,
    username: captured.username || existing.username,
    password: captured.password,
  };
}
