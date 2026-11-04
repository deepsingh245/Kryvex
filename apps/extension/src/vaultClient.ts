import {
  decryptBytes,
  deriveAuthAndStretchedKey,
  deriveKdfMaterial,
  hexToBytes,
  wipeBytes,
} from "@kryvex/crypto";
import {
  createVaultItem,
  fetchUserProfileDocument,
  fetchVaultItem,
  fetchVaultItems,
  initializeKryvexFirebaseExtension,
  resolveKdfParamsForEmail,
  signInWithAuthSecretExtension,
  signOutKryvexExtension,
  subscribeToVaultItems,
  updateVaultItem,
} from "@kryvex/firebase/extension";
import {
  applyRemoteDoc,
  beginLocalWrite,
  confirmLocalWrite,
  dismissConflict,
  initialSyncState,
  rejectLocalWrite,
  type SyncConflict,
  type SyncState,
} from "@kryvex/sync";
import type {
  LoginContent,
  UserProfileSettings,
  VaultItemDocument,
} from "@kryvex/types";
import {
  encryptedEnvelopeSchema,
  userProfileSettingsSchema,
  vaultItemDocumentSchema,
} from "@kryvex/validation";
import {
  decryptItemContent,
  encryptItemContent,
  loginWebsiteMatchesOrigin,
  normalizeLoginOrigin,
  reencryptItemContent,
} from "@kryvex/vault";
import { z } from "zod";
import {
  allowLocalhostHttp,
  extensionFirebaseConfig,
  extensionFirebaseEmulatorEnv,
  kryvexWebOrigin,
} from "./config";
import { createExtensionLocalStore } from "./localStore";
import type { ExtensionStatus, MatchSummary, PendingPrompt } from "./messages";
import {
  DEFAULT_AUTO_LOCK_MINUTES,
  DRAFT_TTL_MS,
  clearUnlockedSession,
  clearConflictHandoff,
  deleteEncryptedDraft,
  findEncryptedDraft,
  getConflictHandoff,
  getEncryptedDraft,
  getUnlockedSession,
  putEncryptedDraft,
  storeConflictHandoff,
  storeUnlockedSession,
  touchUnlockedSession,
  type ConflictHandoff,
  type EncryptedCredentialDraft,
  type UnlockedSession,
} from "./session";
import { decideCapture, mergeCapturedLogin } from "./captureDecision";
import { shouldPersistRemoteDoc } from "./syncCachePolicy";

const services = initializeKryvexFirebaseExtension(
  extensionFirebaseConfig,
  extensionFirebaseEmulatorEnv,
);
const localStore = createExtensionLocalStore();

const kdfParamsSchema = z.object({
  memoryKiB: z.number().int().positive(),
  iterations: z.number().int().positive(),
  parallelism: z.number().int().positive(),
  version: z.number().int().nonnegative(),
});

const preloginSchema = z.object({
  kdfSalt: z.string().min(1),
  kdfParams: kdfParamsSchema,
});

const profileSchema = preloginSchema.extend({
  protectedVaultKey: encryptedEnvelopeSchema,
  settings: userProfileSettingsSchema.optional(),
});

interface FillGrant {
  tabId: number;
  origin: string;
  itemIds: Set<string>;
  expiresAt: number;
}

interface DecryptedLogin {
  doc: VaultItemDocument;
  content: LoginContent;
}

const fillGrants = new Map<string, FillGrant>();
let unsubscribeItems: (() => void) | null = null;
let subscribedUid: string | null = null;

function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "permission-denied"
  );
}

function usernameKey(value: string): string {
  const trimmed = value.trim();
  return trimmed.includes("@") ? trimmed.toLowerCase() : trimmed;
}

async function authUser(): Promise<{ uid: string; email: string } | null> {
  await services.auth.authStateReady();
  const user = services.auth.currentUser;
  return user ? { uid: user.uid, email: user.email ?? "" } : null;
}

async function currentSession(): Promise<UnlockedSession | null> {
  const [user, session] = await Promise.all([authUser(), getUnlockedSession()]);
  if (!user || !session || session.uid !== user.uid) {
    if (session) wipeBytes(session.vaultEncryptionKey);
    await clearUnlockedSession();
    stopListener();
    return null;
  }
  return session;
}

async function loadSyncState(uid: string): Promise<SyncState> {
  return (await localStore.getSyncState(uid)) ?? initialSyncState;
}

async function persistRemoteDocs(
  uid: string,
  docs: VaultItemDocument[],
): Promise<void> {
  let sync = await loadSyncState(uid);
  const acceptedDocs: VaultItemDocument[] = [];
  for (const doc of docs) {
    if (shouldPersistRemoteDoc(sync, doc)) acceptedDocs.push(doc);
    sync = applyRemoteDoc(sync, doc);
  }
  await Promise.all([
    localStore.putItems(uid, acceptedDocs),
    localStore.putSyncState(uid, sync),
  ]);
}

function parseVaultDocs(
  rawDocs: Record<string, unknown>[],
): VaultItemDocument[] {
  const docs: VaultItemDocument[] = [];
  for (const raw of rawDocs) {
    const parsed = vaultItemDocumentSchema.safeParse(raw);
    if (parsed.success) docs.push(parsed.data as VaultItemDocument);
  }
  return docs;
}

async function handleRemoteDocs(
  uid: string,
  rawDocs: Record<string, unknown>[],
): Promise<void> {
  await persistRemoteDocs(uid, parseVaultDocs(rawDocs));
}

function stopListener(): void {
  unsubscribeItems?.();
  unsubscribeItems = null;
  subscribedUid = null;
}

function startListener(uid: string): void {
  if (subscribedUid === uid && unsubscribeItems) return;
  stopListener();
  subscribedUid = uid;
  unsubscribeItems = subscribeToVaultItems(
    services.firestore,
    uid,
    (rawDocs) => {
      void handleRemoteDocs(uid, rawDocs);
    },
    () => {
      // The encrypted cache remains usable. A later action retries a one-shot
      // reconciliation; never include network errors or secrets in logs.
    },
  );
}

async function attemptWrite(
  uid: string,
  itemId: string,
  envelope: VaultItemDocument,
  writeKind: "create" | "update",
): Promise<"synced" | "pending" | "conflict"> {
  let sync = await loadSyncState(uid);
  sync = beginLocalWrite(
    sync,
    itemId,
    envelope.revision - 1,
    envelope,
    writeKind,
  );
  await Promise.all([
    localStore.putItems(uid, [envelope]),
    localStore.putSyncState(uid, sync),
  ]);

  try {
    if (writeKind === "create") {
      await createVaultItem(
        services.firestore,
        uid,
        itemId,
        envelope as unknown as Record<string, unknown>,
      );
    } else {
      await updateVaultItem(
        services.firestore,
        uid,
        itemId,
        envelope as unknown as Record<string, unknown>,
      );
    }
    sync = confirmLocalWrite(sync, itemId);
    await localStore.putSyncState(uid, sync);
    return "synced";
  } catch (error) {
    if (isPermissionDenied(error)) {
      try {
        const serverRaw = await fetchVaultItem(services.firestore, uid, itemId);
        const parsed = serverRaw
          ? vaultItemDocumentSchema.safeParse(serverRaw)
          : undefined;
        if (parsed?.success) {
          sync = rejectLocalWrite(
            sync,
            itemId,
            parsed.data as VaultItemDocument,
          );
          await localStore.putSyncState(uid, sync);
          return "conflict";
        }
      } catch {
        // Re-fetch can fail independently; keep the encrypted pending write.
      }
    }
    // Offline/unknown: ciphertext and pending metadata are already durable.
    return "pending";
  }
}

async function retryPending(uid: string): Promise<void> {
  const sync = await loadSyncState(uid);
  for (const [itemId, pending] of Object.entries(sync.pendingWrites)) {
    await attemptWrite(uid, itemId, pending.localDoc, pending.writeKind);
  }
}

export async function reconcileVault(uid: string): Promise<void> {
  try {
    const rawDocs = await fetchVaultItems(services.firestore, uid);
    await handleRemoteDocs(uid, rawDocs);
    await retryPending(uid);
    startListener(uid);
  } catch {
    // Offline is expected. The encrypted local cache and pending queue remain.
  }
}

async function decryptLogins(
  session: UnlockedSession,
): Promise<DecryptedLogin[]> {
  const [docs, sync] = await Promise.all([
    localStore.getItems(session.uid),
    loadSyncState(session.uid),
  ]);
  const conflicted = new Set(Object.keys(sync.conflicts));
  const logins: DecryptedLogin[] = [];
  for (const doc of docs) {
    if (doc.type !== "login" || doc.deleted || conflicted.has(doc.id)) {
      continue;
    }
    try {
      const content = decryptItemContent(
        session.vaultEncryptionKey,
        doc.wrappedItemKey,
        doc.encryptedData,
      );
      if (content.type === "login") logins.push({ doc, content });
    } catch {
      // Corrupt/tampered entries fail closed and are never offered for fill.
    }
  }
  return logins;
}

function matchingLogins(
  logins: DecryptedLogin[],
  url: string,
): DecryptedLogin[] {
  return logins.filter(({ content }) =>
    loginWebsiteMatchesOrigin(content.websites, url, { allowLocalhostHttp }),
  );
}

function toSummary(login: DecryptedLogin): MatchSummary {
  return {
    itemId: login.doc.id,
    title: login.content.title,
    username: login.content.username,
  };
}

async function profileAndVaultKey(
  uid: string,
  masterPassword: string,
): Promise<{
  vaultEncryptionKey: Uint8Array;
  settings: UserProfileSettings | undefined;
}> {
  const rawProfile = await fetchUserProfileDocument(services.firestore, uid);
  const parsed = profileSchema.safeParse(rawProfile);
  if (!parsed.success) throw new Error("Unable to unlock this vault.");

  const { masterKey } = await deriveKdfMaterial(
    masterPassword,
    hexToBytes(parsed.data.kdfSalt),
    parsed.data.kdfParams,
  );
  const { stretchedMasterKey } = deriveAuthAndStretchedKey(masterKey);
  wipeBytes(masterKey);
  try {
    return {
      vaultEncryptionKey: decryptBytes(
        stretchedMasterKey,
        parsed.data.protectedVaultKey,
      ),
      settings: parsed.data.settings,
    };
  } finally {
    wipeBytes(stretchedMasterKey);
  }
}

async function finishUnlock(
  uid: string,
  email: string,
  masterPassword: string,
): Promise<void> {
  const { vaultEncryptionKey, settings } = await profileAndVaultKey(
    uid,
    masterPassword,
  );
  try {
    await storeUnlockedSession({
      uid,
      email,
      vaultEncryptionKey,
      autoLockMinutes: settings?.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES,
    });
  } finally {
    wipeBytes(vaultEncryptionKey);
  }
  await reconcileVault(uid);
}

export async function signInAndUnlock(
  email: string,
  masterPassword: string,
): Promise<void> {
  const rawParams = await resolveKdfParamsForEmail(services.functions, email);
  const parsedParams = preloginSchema.safeParse(rawParams);
  if (!parsedParams.success) throw new Error("Invalid email or password.");

  const { masterKey } = await deriveKdfMaterial(
    masterPassword,
    hexToBytes(parsedParams.data.kdfSalt),
    parsedParams.data.kdfParams,
  );
  const { authSecret, stretchedMasterKey } =
    deriveAuthAndStretchedKey(masterKey);
  wipeBytes(masterKey);
  try {
    const user = await signInWithAuthSecretExtension(
      services.auth,
      email,
      authSecret,
    );
    const rawProfile = await fetchUserProfileDocument(
      services.firestore,
      user.uid,
    );
    const profile = profileSchema.safeParse(rawProfile);
    if (!profile.success) throw new Error("Unable to unlock this vault.");
    const vaultEncryptionKey = decryptBytes(
      stretchedMasterKey,
      profile.data.protectedVaultKey,
    );
    try {
      await storeUnlockedSession({
        uid: user.uid,
        email: user.email,
        vaultEncryptionKey,
        autoLockMinutes:
          profile.data.settings?.autoLockMinutes ?? DEFAULT_AUTO_LOCK_MINUTES,
      });
    } finally {
      wipeBytes(vaultEncryptionKey);
    }
    await reconcileVault(user.uid);
  } finally {
    wipeBytes(stretchedMasterKey);
  }
}

export async function unlock(masterPassword: string): Promise<void> {
  const user = await authUser();
  if (!user) throw new Error("Sign in first.");
  await finishUnlock(user.uid, user.email, masterPassword);
}

export async function lock(): Promise<void> {
  stopListener();
  fillGrants.clear();
  await clearUnlockedSession();
}

export async function signOut(): Promise<void> {
  await lock();
  await signOutKryvexExtension(services.auth);
}

export async function getStatus(): Promise<ExtensionStatus> {
  const user = await authUser();
  if (!user) return { state: "SIGNED_OUT", conflictCount: 0 };
  const session = await currentSession();
  const sync = await loadSyncState(user.uid);
  const conflictCount = Object.keys(sync.conflicts).length;
  if (!session) {
    return { state: "LOCKED", email: user.email, conflictCount };
  }
  startListener(user.uid);
  const expiresAt = session.expiresAt;
  wipeBytes(session.vaultEncryptionKey);
  return {
    state: "UNLOCKED",
    email: user.email,
    expiresAt,
    conflictCount,
  };
}

export async function listMatches(
  tabId: number,
  url: string,
): Promise<{ matches: MatchSummary[]; grant: string }> {
  const session = await currentSession();
  if (!session) throw new Error("Vault is locked.");
  const normalized = normalizeLoginOrigin(url, { allowLocalhostHttp });
  if (!normalized) throw new Error("Kryvex does not fill on this page.");
  try {
    const matches = matchingLogins(await decryptLogins(session), url).map(
      toSummary,
    );
    const grant = randomId();
    fillGrants.set(grant, {
      tabId,
      origin: normalized.origin,
      itemIds: new Set(matches.map((match) => match.itemId)),
      expiresAt: Date.now() + 30_000,
    });
    await touchUnlockedSession();
    return { matches, grant };
  } finally {
    wipeBytes(session.vaultEncryptionKey);
  }
}

export async function getCredential(
  tabId: number,
  url: string,
  itemId: string,
  grantId: string,
): Promise<{ username: string; password: string }> {
  const normalized = normalizeLoginOrigin(url, { allowLocalhostHttp });
  const grant = fillGrants.get(grantId);
  fillGrants.delete(grantId);
  if (
    !normalized ||
    !grant ||
    grant.expiresAt <= Date.now() ||
    grant.tabId !== tabId ||
    grant.origin !== normalized.origin ||
    !grant.itemIds.has(itemId)
  ) {
    throw new Error("This fill request expired. Open Kryvex again.");
  }

  const session = await currentSession();
  if (!session) throw new Error("Vault is locked.");
  try {
    const login = matchingLogins(await decryptLogins(session), url).find(
      ({ doc }) => doc.id === itemId,
    );
    if (!login) throw new Error("Login is no longer available for this site.");
    await touchUnlockedSession();
    return {
      username: login.content.username,
      password: login.content.password,
    };
  } finally {
    wipeBytes(session.vaultEncryptionKey);
  }
}

function buildDraftPrompt(
  draft: EncryptedCredentialDraft,
  content: LoginContent,
  candidates: DecryptedLogin[],
): PendingPrompt {
  const normalized = normalizeLoginOrigin(draft.origin, { allowLocalhostHttp });
  return {
    draftId: draft.id,
    mode: draft.mode,
    hostname: normalized?.hostname ?? draft.origin,
    username: content.username,
    candidates: candidates
      .filter(({ doc }) => draft.candidateItemIds.includes(doc.id))
      .map(toSummary),
    expiresAt: draft.expiresAt,
  };
}

export async function captureCredential(
  tabId: number,
  url: string,
  username: string,
  password: string,
  kind: "signin" | "signup" | "password-change",
): Promise<{
  status: "locked" | "unchanged" | "drafted";
  prompt?: PendingPrompt;
}> {
  const session = await currentSession();
  if (!session) return { status: "locked" };
  const normalized = normalizeLoginOrigin(url, { allowLocalhostHttp });
  if (!normalized)
    throw new Error("Kryvex does not save passwords from this page.");

  try {
    const siteMatches = matchingLogins(await decryptLogins(session), url);
    const key = usernameKey(username);
    let accountMatches = siteMatches.filter(
      ({ content }) => usernameKey(content.username) === key,
    );
    if (!key && kind === "password-change") accountMatches = siteMatches;
    else if (!key && siteMatches.length === 1) accountMatches = siteMatches;

    const decision = decideCapture(
      password,
      accountMatches.map(({ content }) => content.password),
    );
    if (decision === "unchanged") {
      return { status: "unchanged" };
    }

    const content: LoginContent = {
      type: "login",
      title: normalized.hostname,
      tags: [],
      customFields: [],
      username,
      password,
      websites: [normalized.origin],
    };
    const encrypted = encryptItemContent(session.vaultEncryptionKey, content);
    const candidate: VaultItemDocument = {
      id: randomId(),
      ownerId: session.uid,
      type: "login",
      revision: 0,
      createdAt: null,
      updatedAt: null,
      deleted: false,
      favorite: false,
      wrappedItemKey: encrypted.wrappedItemKey,
      encryptedData: encrypted.encryptedData,
      attachmentRefs: [],
    };
    const mode = decision;
    const draft: EncryptedCredentialDraft = {
      id: randomId(),
      uid: session.uid,
      tabId,
      origin: normalized.origin,
      expiresAt: Date.now() + DRAFT_TTL_MS,
      candidate,
      candidateItemIds: accountMatches.map(({ doc }) => doc.id),
      mode,
    };
    await putEncryptedDraft(draft);
    await touchUnlockedSession();
    return {
      status: "drafted",
      prompt: buildDraftPrompt(draft, content, accountMatches),
    };
  } finally {
    wipeBytes(session.vaultEncryptionKey);
  }
}

export async function getPendingPrompt(
  tabId: number,
  url: string,
): Promise<PendingPrompt | null> {
  const session = await currentSession();
  if (!session) return null;
  const normalized = normalizeLoginOrigin(url, { allowLocalhostHttp });
  if (!normalized) return null;
  try {
    const draft = await findEncryptedDraft(tabId, normalized.origin);
    if (!draft || draft.uid !== session.uid) return null;
    const content = decryptItemContent(
      session.vaultEncryptionKey,
      draft.candidate.wrappedItemKey,
      draft.candidate.encryptedData,
    );
    if (content.type !== "login") return null;
    return buildDraftPrompt(
      draft,
      content,
      matchingLogins(await decryptLogins(session), url),
    );
  } finally {
    wipeBytes(session.vaultEncryptionKey);
  }
}

export async function commitDraft(
  tabId: number,
  url: string,
  draftId: string,
  action: "save" | "update" | "save-new",
  targetItemId?: string,
): Promise<{ result: "synced" | "pending" | "conflict" }> {
  const session = await currentSession();
  if (!session) throw new Error("Vault is locked.");
  const normalized = normalizeLoginOrigin(url, { allowLocalhostHttp });
  const draft = await getEncryptedDraft(draftId);
  if (
    !normalized ||
    !draft ||
    draft.uid !== session.uid ||
    draft.tabId !== tabId ||
    draft.origin !== normalized.origin
  ) {
    wipeBytes(session.vaultEncryptionKey);
    throw new Error("This save request expired.");
  }

  try {
    let envelope = draft.candidate;
    let writeKind: "create" | "update" = "create";
    if (action === "update") {
      const selectedId =
        targetItemId ??
        (draft.candidateItemIds.length === 1
          ? draft.candidateItemIds[0]
          : undefined);
      if (!selectedId || !draft.candidateItemIds.includes(selectedId)) {
        throw new Error("Choose which Kryvex login to update.");
      }
      const existing = (await localStore.getItems(session.uid)).find(
        (doc) => doc.id === selectedId,
      );
      if (!existing || existing.deleted || existing.type !== "login") {
        throw new Error("That login is no longer available.");
      }
      const content = decryptItemContent(
        session.vaultEncryptionKey,
        draft.candidate.wrappedItemKey,
        draft.candidate.encryptedData,
      );
      const existingContent = decryptItemContent(
        session.vaultEncryptionKey,
        existing.wrappedItemKey,
        existing.encryptedData,
      );
      if (content.type !== "login" || existingContent.type !== "login") {
        throw new Error("That login is no longer available.");
      }
      const updatedContent = mergeCapturedLogin(existingContent, content);
      const { encryptedData } = reencryptItemContent(
        session.vaultEncryptionKey,
        existing.wrappedItemKey,
        updatedContent,
      );
      envelope = {
        ...existing,
        revision: existing.revision + 1,
        updatedAt: null,
        encryptedData,
      };
      writeKind = "update";
    } else if (action === "save-new" && draft.mode !== "save") {
      envelope = { ...draft.candidate, id: randomId() };
    }

    const result = await attemptWrite(
      session.uid,
      envelope.id,
      envelope,
      writeKind,
    );
    await deleteEncryptedDraft(draftId);
    await touchUnlockedSession();
    return { result };
  } finally {
    wipeBytes(session.vaultEncryptionKey);
  }
}

export async function listConflicts(): Promise<
  { itemId: string; localRevision: number; serverRevision: number }[]
> {
  const user = await authUser();
  if (!user) return [];
  const sync = await loadSyncState(user.uid);
  return Object.values(sync.conflicts).map((conflict) => ({
    itemId: conflict.itemId,
    localRevision: conflict.localDoc.revision,
    serverRevision: conflict.serverDoc.revision,
  }));
}

export async function openConflicts(conflictId?: string): Promise<void> {
  const user = await authUser();
  if (!user) throw new Error("Sign in first.");
  const tab = await chrome.tabs.create({
    url: `${kryvexWebOrigin}/conflicts?source=extension`,
    active: true,
  });
  if (typeof tab.id !== "number") throw new Error("Unable to open Kryvex.");
  await storeConflictHandoff({
    tabId: tab.id,
    uid: user.uid,
    expiresAt: Date.now() + 10 * 60_000,
    ...(conflictId ? { conflictId } : {}),
  });
}

async function trustedWebHandoff(
  tabId: number,
  url: string,
): Promise<ConflictHandoff | null> {
  try {
    const [handoff, user] = await Promise.all([
      getConflictHandoff(),
      authUser(),
    ]);
    if (
      handoff &&
      user?.uid === handoff.uid &&
      handoff.tabId === tabId &&
      new URL(url).origin === kryvexWebOrigin
    ) {
      return handoff;
    }
    await clearConflictHandoff();
    return null;
  } catch {
    await clearConflictHandoff();
    return null;
  }
}

export async function pullConflict(
  tabId: number,
  url: string,
  requestedId?: string,
): Promise<SyncConflict | null> {
  const handoff = await trustedWebHandoff(tabId, url);
  if (!handoff) {
    throw new Error("Conflict handoff is not available on this page.");
  }
  const sync = await loadSyncState(handoff.uid);
  const id = requestedId ?? handoff.conflictId;
  return id
    ? (sync.conflicts[id] ?? null)
    : (Object.values(sync.conflicts)[0] ?? null);
}

export async function acknowledgeConflictResolution(
  tabId: number,
  url: string,
  conflictId: string,
): Promise<void> {
  const handoff = await trustedWebHandoff(tabId, url);
  if (!handoff) {
    throw new Error("Conflict handoff is not available on this page.");
  }
  let sync = await loadSyncState(handoff.uid);
  sync = dismissConflict(sync, conflictId);
  await localStore.putSyncState(handoff.uid, sync);
  if (handoff.conflictId === conflictId) await clearConflictHandoff();
}

export async function dismissDraft(draftId: string): Promise<void> {
  await deleteEncryptedDraft(draftId);
}

export async function syncNow(): Promise<void> {
  const session = await currentSession();
  if (!session) throw new Error("Vault is locked.");
  try {
    await reconcileVault(session.uid);
    await touchUnlockedSession();
  } finally {
    wipeBytes(session.vaultEncryptionKey);
  }
}
