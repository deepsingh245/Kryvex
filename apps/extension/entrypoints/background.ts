import {
  extensionRequestSchema,
  type ExtensionResponse,
} from "../src/messages";
import {
  acknowledgeConflictResolution,
  captureCredential,
  commitDraft,
  dismissDraft,
  getCredential,
  getPendingPrompt,
  getStatus,
  listConflicts,
  listMatches,
  lock,
  openConflicts,
  pullConflict,
  reconcileVault,
  signInAndUnlock,
  signOut,
  syncNow,
  unlock,
} from "../src/vaultClient";
import {
  AUTO_LOCK_ALARM,
  configureSessionStorage,
  getUnlockedSession,
} from "../src/session";
import { allowLocalhostHttp } from "../src/config";
import { validateContentSender } from "../src/senderValidation";

function success<T>(data: T): ExtensionResponse<T> {
  return { ok: true, data };
}

function failure(error: string): ExtensionResponse<never> {
  return { ok: false, error };
}

function contentSender(
  sender: chrome.runtime.MessageSender,
  requestUrl: string,
): { tabId: number; url: string } {
  return validateContentSender({
    extensionId: sender.id,
    runtimeId: chrome.runtime.id,
    frameId: sender.frameId,
    tabId: sender.tab?.id,
    senderUrl: sender.url,
    requestUrl,
    allowLocalhostHttp,
  });
}

function extensionPageSender(sender: chrome.runtime.MessageSender): void {
  if (sender.id !== chrome.runtime.id || sender.tab) {
    throw new Error("Open the Kryvex extension to perform this action.");
  }
}

async function broadcastSessionState(): Promise<void> {
  const status = await getStatus();
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(
    tabs
      .filter((tab) => typeof tab.id === "number")
      .map((tab) =>
        chrome.tabs.sendMessage(tab.id!, {
          type: "KRYVEX_SESSION_STATE",
          state: status.state,
        }),
      ),
  );
}

async function handleRequest(
  raw: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const parsed = extensionRequestSchema.safeParse(raw);
  if (!parsed.success) return failure("Invalid extension request.");
  const request = parsed.data;

  try {
    switch (request.type) {
      case "GET_STATUS":
        return success(await getStatus());
      case "SIGN_IN":
        extensionPageSender(sender);
        await signInAndUnlock(request.email, request.masterPassword);
        await broadcastSessionState();
        return success(await getStatus());
      case "UNLOCK":
        extensionPageSender(sender);
        await unlock(request.masterPassword);
        await broadcastSessionState();
        return success(await getStatus());
      case "LOCK":
        extensionPageSender(sender);
        await lock();
        await broadcastSessionState();
        return success(await getStatus());
      case "SIGN_OUT":
        extensionPageSender(sender);
        await signOut();
        await broadcastSessionState();
        return success(await getStatus());
      case "SYNC_NOW":
        extensionPageSender(sender);
        await syncNow();
        return success(await getStatus());
      case "OPEN_POPUP": {
        contentSender(sender, sender.url ?? "");
        await chrome.action.openPopup();
        return success(null);
      }
      case "LIST_MATCHES": {
        const page = contentSender(sender, request.url);
        return success(await listMatches(page.tabId, page.url));
      }
      case "GET_CREDENTIAL": {
        const page = contentSender(sender, request.url);
        return success(
          await getCredential(
            page.tabId,
            page.url,
            request.itemId,
            request.grant,
          ),
        );
      }
      case "CAPTURE_CREDENTIAL": {
        const page = contentSender(sender, request.url);
        return success(
          await captureCredential(
            page.tabId,
            page.url,
            request.username,
            request.password,
            request.kind,
          ),
        );
      }
      case "GET_PENDING_PROMPT": {
        const page = contentSender(sender, request.url);
        return success(await getPendingPrompt(page.tabId, page.url));
      }
      case "COMMIT_DRAFT": {
        const page = contentSender(sender, request.url);
        return success(
          await commitDraft(
            page.tabId,
            page.url,
            request.draftId,
            request.action,
            request.targetItemId,
          ),
        );
      }
      case "DISMISS_DRAFT":
        contentSender(sender, request.url);
        await dismissDraft(request.draftId);
        return success(null);
      case "LIST_CONFLICTS":
        extensionPageSender(sender);
        return success(await listConflicts());
      case "OPEN_CONFLICTS":
        extensionPageSender(sender);
        await openConflicts(request.conflictId);
        return success(null);
      case "PULL_CONFLICT": {
        const page = contentSender(sender, sender.url ?? "");
        return success(
          await pullConflict(page.tabId, page.url, request.conflictId),
        );
      }
      case "CONFLICT_RESOLVED": {
        const page = contentSender(sender, sender.url ?? "");
        await acknowledgeConflictResolution(
          page.tabId,
          page.url,
          request.conflictId,
        );
        return success(null);
      }
    }
  } catch (error) {
    if (request.type === "SIGN_IN") {
      return failure(
        "Unable to sign in. Check your email and master password.",
      );
    }
    if (request.type === "UNLOCK") {
      return failure("Unable to unlock. Check your master password.");
    }
    return failure(
      error instanceof Error
        ? error.message
        : "Kryvex could not complete this action.",
    );
  }
}

export default defineBackground(() => {
  void configureSessionStorage();

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void handleRequest(message, sender).then(sendResponse);
    return true;
  });

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== AUTO_LOCK_ALARM) return;
    void lock().then(broadcastSessionState);
  });

  chrome.runtime.onInstalled.addListener(() => {
    void lock();
  });

  void getUnlockedSession().then((session) => {
    if (!session) return;
    void reconcileVault(session.uid);
    session.vaultEncryptionKey.fill(0);
  });
});
