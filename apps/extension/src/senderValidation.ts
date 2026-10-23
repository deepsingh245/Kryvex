import { normalizeLoginOrigin } from "@kryvex/vault";

export interface ContentSenderClaim {
  extensionId: string | undefined;
  runtimeId: string;
  frameId: number | undefined;
  tabId: number | undefined;
  senderUrl: string | undefined;
  requestUrl: string;
  allowLocalhostHttp: boolean;
}

export function validateContentSender(claim: ContentSenderClaim): {
  tabId: number;
  url: string;
} {
  if (
    claim.extensionId !== claim.runtimeId ||
    claim.frameId !== 0 ||
    typeof claim.tabId !== "number" ||
    !claim.senderUrl
  ) {
    throw new Error("This request must come from the active page.");
  }
  const sent = normalizeLoginOrigin(claim.senderUrl, {
    allowLocalhostHttp: claim.allowLocalhostHttp,
  });
  const requested = normalizeLoginOrigin(claim.requestUrl, {
    allowLocalhostHttp: claim.allowLocalhostHttp,
  });
  if (!sent || !requested || sent.origin !== requested.origin) {
    throw new Error("The page origin changed. Try again.");
  }
  return { tabId: claim.tabId, url: claim.senderUrl };
}
