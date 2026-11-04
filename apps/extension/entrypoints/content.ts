import { allowLocalhostHttp, kryvexWebOrigin } from "../src/config";
import {
  captureCredentialFromScope,
  findCredentialScope,
  isEligiblePasswordInput,
} from "../src/formDetection";
import {
  sendExtensionRequest,
  type ExtensionStatus,
  type MatchSummary,
  type PendingPrompt,
} from "../src/messages";
import { normalizeLoginOrigin } from "@kryvex/vault";

const lastCapture = new WeakMap<ParentNode, number>();
const iconViews: { input: HTMLInputElement; host: HTMLElement }[] = [];
const fieldTokenAttribute = "data-kryvex-field-token";
const fieldHostAttribute = "data-kryvex-field-control";
const layerOwnerAttribute = "data-kryvex-layer-owner";
let vaultUnlocked = false;
let activePanel: HTMLElement | null = null;

const commonStyles = `
  :host { all: initial; color-scheme: light dark; }
  * { box-sizing: border-box; }
  button { font: inherit; }
  .surface {
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #f8fafc;
    background: #111827;
    border: 1px solid #334155;
    border-radius: 14px;
    box-shadow: 0 16px 48px rgba(0,0,0,.34);
  }
  .brand { display:flex; align-items:center; gap:9px; font-weight:750; letter-spacing:.08em; }
  .brand img { width:22px; height:22px; object-fit:contain; }
  .muted { color:#94a3b8; font-size:12px; line-height:1.45; }
  .primary, .secondary, .ghost, .choice {
    min-height:36px; border-radius:10px; cursor:pointer; transition:background 150ms ease,border-color 150ms ease;
  }
  .primary { border:1px solid #6366f1; background:#6366f1; color:white; padding:8px 14px; font-weight:650; }
  .primary:hover { background:#4f46e5; }
  .secondary { border:1px solid #334155; background:#1a2332; color:#f8fafc; padding:8px 12px; }
  .secondary:hover, .choice:hover { border-color:#6366f1; background:#202a3d; }
  .ghost { border:0; background:transparent; color:#94a3b8; padding:8px 10px; }
  .ghost:hover { color:#f8fafc; background:#1a2332; }
  button:focus-visible { outline:2px solid #818cf8; outline-offset:2px; }
  @media (prefers-color-scheme: light) {
    .surface { color:#0f172a; background:#fff; border-color:#c7d2e5; box-shadow:0 16px 44px rgba(30,41,59,.18); }
    .muted { color:#64748b; }
    .secondary { border-color:#c7d2e5; background:#f8faff; color:#0f172a; }
    .secondary:hover, .choice:hover { background:#eef2ff; border-color:#4f46e5; }
    .ghost { color:#64748b; }
    .ghost:hover { color:#0f172a; background:#eef2ff; }
  }
  @media (prefers-reduced-motion: reduce) { * { transition:none !important; } }
`;

function createLayerHost(zIndex: number): {
  host: HTMLElement;
  root: ShadowRoot;
} {
  const host = document.createElement("div");
  host.dataset.kryvexUi = "true";
  host.setAttribute(layerOwnerAttribute, chrome.runtime.id);
  host.style.position = "fixed";
  host.style.zIndex = String(zIndex);
  const root = host.attachShadow({ mode: "closed" });
  document.documentElement.append(host);
  return { host, root };
}

function clearPanel(): void {
  activePanel?.remove();
  activePanel = null;
}

function createBrand(label = "KRYVEX"): HTMLElement {
  const brand = document.createElement("div");
  brand.className = "brand";
  const image = document.createElement("img");
  image.alt = "";
  image.src = chrome.runtime.getURL("brand/kryvex-mark.png");
  const text = document.createElement("span");
  text.textContent = label;
  brand.append(image, text);
  return brand;
}

function showNotice(
  title: string,
  message: string,
  action?: { label: string; run: () => void },
): void {
  clearPanel();
  const { host, root } = createLayerHost(2147483647);
  activePanel = host;
  host.style.right = "20px";
  host.style.bottom = "20px";
  const wrapper = document.createElement("div");
  wrapper.className = "surface";
  wrapper.style.cssText = "width:min(360px,calc(100vw - 32px));padding:16px;";
  const titleElement = document.createElement("div");
  titleElement.style.cssText = "font-weight:700;margin-top:12px";
  titleElement.textContent = title;
  const messageElement = document.createElement("div");
  messageElement.className = "muted";
  messageElement.style.marginTop = "5px";
  messageElement.textContent = message;
  wrapper.append(createBrand(), titleElement, messageElement);
  if (action) {
    const button = document.createElement("button");
    button.className = "primary";
    button.style.marginTop = "12px";
    button.textContent = action.label;
    button.addEventListener("click", (event) => {
      if (!event.isTrusted) return;
      action.run();
    });
    wrapper.append(button);
  }
  const close = document.createElement("button");
  close.className = "ghost";
  close.textContent = "Dismiss";
  close.style.marginTop = "8px";
  close.addEventListener("click", (event) => {
    if (event.isTrusted) clearPanel();
  });
  wrapper.append(close);
  const style = document.createElement("style");
  style.textContent = commonStyles;
  root.append(style, wrapper);
}

function findUsernameInput(scope: ParentNode): HTMLInputElement | null {
  const inputs = Array.from(scope.querySelectorAll<HTMLInputElement>("input"));
  return (
    inputs.find((input) => input.autocomplete.toLowerCase() === "username") ??
    inputs.find(
      (input) =>
        input.autocomplete.toLowerCase() === "email" || input.type === "email",
    ) ??
    inputs.find(
      (input) =>
        input.type !== "password" &&
        /(?:user|login|email|account)/i.test(`${input.name} ${input.id}`),
    ) ??
    null
  );
}

function setNativeValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  )?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

async function fillCredential(
  input: HTMLInputElement,
  match: MatchSummary,
  grant: string,
): Promise<void> {
  const response = await sendExtensionRequest<{
    username: string;
    password: string;
  }>({
    type: "GET_CREDENTIAL",
    url: location.href,
    itemId: match.itemId,
    grant,
  });
  if (!response.ok) {
    showNotice("Couldn’t fill this login", response.error);
    return;
  }

  const scope = findCredentialScope(input);
  const usernameInput = findUsernameInput(scope);
  if (usernameInput) setNativeValue(usernameInput, response.data.username);
  setNativeValue(input, response.data.password);
  clearPanel();
}

async function showMatches(input: HTMLInputElement): Promise<void> {
  clearPanel();
  const response = await sendExtensionRequest<{
    matches: MatchSummary[];
    grant: string;
  }>({ type: "LIST_MATCHES", url: location.href });
  if (!response.ok) {
    showNotice("Unlock Kryvex", response.error, {
      label: "Open Kryvex",
      run: () => void sendExtensionRequest({ type: "OPEN_POPUP" }),
    });
    return;
  }

  const rect = input.getBoundingClientRect();
  const { host, root } = createLayerHost(2147483647);
  activePanel = host;
  host.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 328))}px`;
  host.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - 280)}px`;

  const panel = document.createElement("div");
  panel.className = "surface";
  panel.style.cssText = "width:320px;padding:12px;";
  panel.append(createBrand("Choose a Kryvex login"));

  if (response.data.matches.length === 0) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No saved login matches this exact hostname.";
    empty.style.margin = "12px 4px 4px";
    panel.append(empty);
  } else {
    const list = document.createElement("div");
    list.style.cssText = "display:grid;gap:7px;margin-top:12px;";
    for (const match of response.data.matches) {
      const choice = document.createElement("button");
      choice.className = "choice";
      choice.style.cssText =
        "border:1px solid #334155;background:transparent;color:inherit;padding:10px;text-align:left;";
      const title = document.createElement("div");
      title.style.fontWeight = "650";
      title.textContent = match.title;
      const account = document.createElement("div");
      account.className = "muted";
      account.textContent = match.username || "No username";
      choice.append(title, account);
      choice.addEventListener("click", (event) => {
        if (!event.isTrusted) return;
        void fillCredential(input, match, response.data.grant);
      });
      list.append(choice);
    }
    panel.append(list);
  }

  const close = document.createElement("button");
  close.className = "ghost";
  close.textContent = "Close";
  close.style.marginTop = "8px";
  close.addEventListener("click", (event) => {
    if (event.isTrusted) clearPanel();
  });
  panel.append(close);
  const style = document.createElement("style");
  style.textContent = commonStyles;
  root.append(style, panel);
}

function hasMountedFieldIcon(token: string): boolean {
  return Array.from(document.documentElement.children).some(
    (element) =>
      element instanceof HTMLElement &&
      element.getAttribute(fieldHostAttribute) === token,
  );
}

function clearStaleInjectedUi(): void {
  for (const element of Array.from(document.documentElement.children)) {
    if (element instanceof HTMLElement && element.dataset.kryvexUi === "true") {
      element.remove();
    }
  }

  for (const input of document.querySelectorAll<HTMLInputElement>(
    `input[${fieldTokenAttribute}]`,
  )) {
    input.removeAttribute(fieldTokenAttribute);
  }
}

function positionIcon(input: HTMLInputElement, host: HTMLElement): boolean {
  if (!input.isConnected || !host.isConnected) {
    if (
      input.getAttribute(fieldTokenAttribute) ===
      host.getAttribute(fieldHostAttribute)
    ) {
      input.removeAttribute(fieldTokenAttribute);
    }
    host.remove();
    return false;
  }
  const rect = input.getBoundingClientRect();
  host.style.left = `${Math.max(4, rect.right - 35)}px`;
  host.style.top = `${rect.top + Math.max(4, (rect.height - 28) / 2)}px`;
  return true;
}

function addIcon(input: HTMLInputElement): void {
  const mountedToken = input.getAttribute(fieldTokenAttribute);
  if (mountedToken && hasMountedFieldIcon(mountedToken)) return;

  input.removeAttribute(fieldTokenAttribute);
  const fieldToken = crypto.randomUUID();
  input.setAttribute(fieldTokenAttribute, fieldToken);
  const { host, root } = createLayerHost(2147483646);
  host.setAttribute(fieldHostAttribute, fieldToken);
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", "Fill with Kryvex");
  button.title = "Fill with Kryvex";
  button.style.cssText = `
    all:initial;box-sizing:border-box;width:28px;height:28px;border-radius:8px;
    display:grid;place-items:center;cursor:pointer;background:#111827;
    border:1px solid #334155;box-shadow:0 2px 8px rgba(0,0,0,.22);
  `;
  const image = document.createElement("img");
  image.alt = "";
  image.src = chrome.runtime.getURL("brand/kryvex-mark.png");
  image.style.cssText = "width:18px;height:18px;object-fit:contain;";
  button.append(image);
  button.addEventListener("click", (event) => {
    if (!event.isTrusted) return;
    event.preventDefault();
    event.stopPropagation();
    void showMatches(input);
  });
  const style = document.createElement("style");
  style.textContent = `button:focus-visible{outline:2px solid #818cf8;outline-offset:2px}`;
  root.append(style, button);
  iconViews.push({ input, host });
  positionIcon(input, host);
}

function scanPasswordFields(root: ParentNode = document): void {
  for (const input of root.querySelectorAll<HTMLInputElement>(
    'input[type="password"]',
  )) {
    if (isEligiblePasswordInput(input)) addIcon(input);
  }
}

function repositionIcons(): void {
  for (let index = iconViews.length - 1; index >= 0; index -= 1) {
    const view = iconViews[index];
    if (view && !positionIcon(view.input, view.host)) {
      iconViews.splice(index, 1);
    }
  }
}

async function maybeCapture(scope: ParentNode): Promise<void> {
  const last = lastCapture.get(scope) ?? 0;
  if (Date.now() - last < 1000) return;
  lastCapture.set(scope, Date.now());
  if (!vaultUnlocked) {
    showNotice(
      "Unlock Kryvex to save this login",
      "For your protection, Kryvex did not capture this password while the vault was locked.",
      {
        label: "Open Kryvex",
        run: () => void sendExtensionRequest({ type: "OPEN_POPUP" }),
      },
    );
    return;
  }

  const candidate = captureCredentialFromScope(scope);
  if (!candidate) return;
  const responsePromise = sendExtensionRequest<{
    status: "locked" | "unchanged" | "drafted";
    prompt?: PendingPrompt;
  }>({
    type: "CAPTURE_CREDENTIAL",
    url: location.href,
    username: candidate.username,
    password: candidate.password,
    kind: candidate.kind,
  });
  candidate.password = "";
  const response = await responsePromise;
  if (!response.ok) return;
  if (response.data.status === "locked") {
    vaultUnlocked = false;
    return;
  }
  if (response.data.prompt) renderSavePrompt(response.data.prompt);
}

function resultMessage(result: "synced" | "pending" | "conflict"): void {
  if (result === "synced") {
    showNotice("Saved in Kryvex", "Your encrypted vault is up to date.");
    window.setTimeout(clearPanel, 2600);
  } else if (result === "pending") {
    showNotice(
      "Saved securely offline",
      "Kryvex will sync the encrypted login when you’re back online.",
    );
  } else {
    showNotice(
      "Update needs your review",
      "Another device changed this login. Resolve both encrypted versions in Kryvex.",
      {
        label: "Resolve in Kryvex",
        run: () => void sendExtensionRequest({ type: "OPEN_POPUP" }),
      },
    );
  }
}

function renderSavePrompt(prompt: PendingPrompt): void {
  clearPanel();
  const { host, root } = createLayerHost(2147483647);
  activePanel = host;
  host.style.right = "20px";
  host.style.bottom = "20px";
  const panel = document.createElement("section");
  panel.className = "surface";
  panel.setAttribute("aria-label", "Save login in Kryvex");
  panel.style.cssText = "width:min(380px,calc(100vw - 32px));padding:18px;";

  const heading = createBrand();
  const title = document.createElement("h2");
  title.style.cssText =
    "font-size:16px;line-height:1.35;margin:14px 0 0;font-weight:750;";
  title.textContent =
    prompt.mode === "save" ? "Save this login?" : "Update a saved login?";
  const detail = document.createElement("p");
  detail.className = "muted";
  detail.style.margin = "6px 0 0";
  detail.textContent = `${prompt.username || "No username"} · ${prompt.hostname}`;
  panel.append(heading, title, detail);

  let selectedId = prompt.candidates[0]?.itemId;
  if (prompt.mode === "choose") {
    const choices = document.createElement("div");
    choices.style.cssText = "display:grid;gap:6px;margin-top:12px;";
    for (const candidate of prompt.candidates) {
      const label = document.createElement("label");
      label.style.cssText =
        "display:flex;gap:9px;align-items:center;padding:9px;border:1px solid #334155;border-radius:10px;cursor:pointer;";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `kryvex-${prompt.draftId}`;
      radio.checked = candidate.itemId === selectedId;
      radio.addEventListener("change", (event) => {
        if (event.isTrusted) selectedId = candidate.itemId;
      });
      const text = document.createElement("span");
      text.textContent = `${candidate.title} — ${candidate.username || "No username"}`;
      label.append(radio, text);
      choices.append(label);
    }
    panel.append(choices);
  }

  const actions = document.createElement("div");
  actions.style.cssText =
    "display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;";
  const primary = document.createElement("button");
  primary.className = "primary";
  primary.textContent = prompt.mode === "save" ? "Save" : "Update";
  primary.addEventListener("click", (event) => {
    if (!event.isTrusted) return;
    const request =
      prompt.mode === "save"
        ? {
            type: "COMMIT_DRAFT" as const,
            url: location.href,
            draftId: prompt.draftId,
            action: "save" as const,
          }
        : {
            type: "COMMIT_DRAFT" as const,
            url: location.href,
            draftId: prompt.draftId,
            action: "update" as const,
            ...(selectedId ? { targetItemId: selectedId } : {}),
          };
    void sendExtensionRequest<{ result: "synced" | "pending" | "conflict" }>(
      request,
    ).then((response) => {
      if (response.ok) resultMessage(response.data.result);
      else showNotice("Couldn’t save this login", response.error);
    });
  });
  actions.append(primary);

  if (prompt.mode !== "save") {
    const saveNew = document.createElement("button");
    saveNew.className = "secondary";
    saveNew.textContent = "Save as new";
    saveNew.addEventListener("click", (event) => {
      if (!event.isTrusted) return;
      void sendExtensionRequest<{ result: "synced" | "pending" | "conflict" }>({
        type: "COMMIT_DRAFT",
        url: location.href,
        draftId: prompt.draftId,
        action: "save-new",
      }).then((response) => {
        if (response.ok) resultMessage(response.data.result);
        else showNotice("Couldn’t save this login", response.error);
      });
    });
    actions.append(saveNew);
  }

  const dismiss = document.createElement("button");
  dismiss.className = "ghost";
  dismiss.textContent = "Not now";
  dismiss.addEventListener("click", (event) => {
    if (!event.isTrusted) return;
    void sendExtensionRequest({
      type: "DISMISS_DRAFT",
      url: location.href,
      draftId: prompt.draftId,
    });
    clearPanel();
  });
  actions.append(dismiss);
  panel.append(actions);
  const style = document.createElement("style");
  style.textContent = commonStyles;
  root.append(style, panel);
}

function setupConflictBridge(): void {
  let currentOrigin: string;
  try {
    currentOrigin = new URL(location.href).origin;
  } catch {
    return;
  }
  if (currentOrigin !== kryvexWebOrigin || location.pathname !== "/conflicts") {
    return;
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== currentOrigin) return;
    const data = event.data as
      | {
          type?: string;
          requestId?: string;
          conflictId?: string;
        }
      | undefined;
    if (!data || typeof data.requestId !== "string") return;

    if (data.type === "KRYVEX_EXTENSION_PULL_CONFLICT") {
      void sendExtensionRequest({
        type: "PULL_CONFLICT",
        ...(data.conflictId ? { conflictId: data.conflictId } : {}),
      }).then((response) => {
        window.postMessage(
          {
            type: "KRYVEX_EXTENSION_CONFLICT",
            requestId: data.requestId,
            response,
          },
          currentOrigin,
        );
      });
    }

    if (
      data.type === "KRYVEX_EXTENSION_CONFLICT_RESOLVED" &&
      typeof data.conflictId === "string"
    ) {
      void sendExtensionRequest({
        type: "CONFLICT_RESOLVED",
        conflictId: data.conflictId,
      });
    }
  });
}

export default defineContentScript({
  matches: [
    "https://*/*",
    ...(import.meta.env.DEV
      ? (["http://localhost/*", "http://127.0.0.1/*"] as const)
      : []),
  ],
  allFrames: false,
  runAt: "document_idle",
  main() {
    const normalized = normalizeLoginOrigin(location.href, {
      allowLocalhostHttp,
    });
    if (!normalized) return;

    setupConflictBridge();
    clearStaleInjectedUi();
    scanPasswordFields();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof HTMLElement)) continue;
          if (
            node.parentElement === document.documentElement &&
            node.dataset.kryvexUi === "true" &&
            !node.hasAttribute(layerOwnerAttribute)
          ) {
            node.remove();
            continue;
          }
          scanPasswordFields(node);
        }
      }
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    window.addEventListener("scroll", repositionIcons, true);
    window.addEventListener("resize", repositionIcons);

    document.addEventListener(
      "submit",
      (event) => {
        if (!event.isTrusted || !(event.target instanceof HTMLFormElement))
          return;
        void maybeCapture(event.target);
      },
      true,
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (
          !event.isTrusted ||
          event.key !== "Enter" ||
          !(event.target instanceof HTMLInputElement) ||
          event.target.type !== "password"
        ) {
          return;
        }
        void maybeCapture(findCredentialScope(event.target));
      },
      true,
    );

    document.addEventListener(
      "click",
      (event) => {
        if (!event.isTrusted || !(event.target instanceof Element)) return;
        const button = event.target.closest<HTMLElement>(
          'button, input[type="submit"], [role="button"]',
        );
        if (!button) return;
        const scope = button.closest("form");
        if (scope?.querySelector('input[type="password"]')) {
          void maybeCapture(scope);
        }
      },
      true,
    );

    chrome.runtime.onMessage.addListener((message: unknown) => {
      const update = message as { type?: string; state?: string };
      if (update.type === "KRYVEX_SESSION_STATE") {
        vaultUnlocked = update.state === "UNLOCKED";
      }
    });

    void sendExtensionRequest<ExtensionStatus>({ type: "GET_STATUS" }).then(
      (response) => {
        vaultUnlocked = response.ok && response.data.state === "UNLOCKED";
      },
    );
    void sendExtensionRequest<PendingPrompt | null>({
      type: "GET_PENDING_PROMPT",
      url: location.href,
    }).then((response) => {
      if (response.ok && response.data) renderSavePrompt(response.data);
    });
  },
});
