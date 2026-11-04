import { base64ToBytes, bytesToBase64, wipeBytes } from "@kryvex/crypto";
import type { VaultItemDocument } from "@kryvex/types";

const SESSION_KEY = "kryvex-unlocked-session-v1";
const DRAFTS_KEY = "kryvex-encrypted-drafts-v1";
const CONFLICT_HANDOFF_KEY = "kryvex-conflict-handoff-v1";
export const AUTO_LOCK_ALARM = "kryvex-auto-lock";
export const DEFAULT_AUTO_LOCK_MINUTES = 5;
export const DRAFT_TTL_MS = 5 * 60_000;

interface StoredUnlockedSession {
  uid: string;
  email: string;
  vaultKeyBase64: string;
  autoLockMinutes: number;
  expiresAt: number;
}

export interface UnlockedSession {
  uid: string;
  email: string;
  vaultEncryptionKey: Uint8Array;
  autoLockMinutes: number;
  expiresAt: number;
}

export interface EncryptedCredentialDraft {
  id: string;
  uid: string;
  tabId: number;
  origin: string;
  expiresAt: number;
  candidate: VaultItemDocument;
  candidateItemIds: string[];
  mode: "save" | "update" | "choose";
}

export interface ConflictHandoff {
  tabId: number;
  uid: string;
  conflictId?: string;
  expiresAt: number;
}

export function isSessionExpired(expiresAt: number, now = Date.now()): boolean {
  return !Number.isFinite(expiresAt) || expiresAt <= now;
}

export async function configureSessionStorage(): Promise<void> {
  await chrome.storage.session.setAccessLevel({
    accessLevel: "TRUSTED_CONTEXTS",
  });
}

export async function storeUnlockedSession(
  session: Omit<UnlockedSession, "expiresAt">,
): Promise<UnlockedSession> {
  const expiresAt = Date.now() + session.autoLockMinutes * 60_000;
  const stored: StoredUnlockedSession = {
    uid: session.uid,
    email: session.email,
    vaultKeyBase64: bytesToBase64(session.vaultEncryptionKey),
    autoLockMinutes: session.autoLockMinutes,
    expiresAt,
  };
  await chrome.storage.session.set({ [SESSION_KEY]: stored });
  await chrome.alarms.create(AUTO_LOCK_ALARM, { when: expiresAt });
  return { ...session, expiresAt };
}

export async function getUnlockedSession(): Promise<UnlockedSession | null> {
  const result = await chrome.storage.session.get(SESSION_KEY);
  const stored = result[SESSION_KEY] as StoredUnlockedSession | undefined;
  if (!stored || isSessionExpired(stored.expiresAt)) {
    await clearUnlockedSession();
    return null;
  }
  try {
    return {
      uid: stored.uid,
      email: stored.email,
      vaultEncryptionKey: base64ToBytes(stored.vaultKeyBase64),
      autoLockMinutes: stored.autoLockMinutes,
      expiresAt: stored.expiresAt,
    };
  } catch {
    await clearUnlockedSession();
    return null;
  }
}

export async function touchUnlockedSession(): Promise<UnlockedSession | null> {
  const session = await getUnlockedSession();
  if (!session) return null;
  try {
    return await storeUnlockedSession({
      uid: session.uid,
      email: session.email,
      vaultEncryptionKey: session.vaultEncryptionKey,
      autoLockMinutes: session.autoLockMinutes,
    });
  } finally {
    wipeBytes(session.vaultEncryptionKey);
  }
}

export async function clearUnlockedSession(): Promise<void> {
  const existing = await chrome.storage.session.get(SESSION_KEY);
  const stored = existing[SESSION_KEY] as StoredUnlockedSession | undefined;
  if (stored?.vaultKeyBase64) {
    try {
      wipeBytes(base64ToBytes(stored.vaultKeyBase64));
    } catch {
      // Corrupt session data is removed below; no usable key buffer exists.
    }
  }
  await chrome.storage.session.remove([
    SESSION_KEY,
    DRAFTS_KEY,
    CONFLICT_HANDOFF_KEY,
  ]);
  await chrome.alarms.clear(AUTO_LOCK_ALARM);
}

async function getDraftMap(): Promise<
  Record<string, EncryptedCredentialDraft>
> {
  const result = await chrome.storage.session.get(DRAFTS_KEY);
  const drafts =
    (result[DRAFTS_KEY] as
      Record<string, EncryptedCredentialDraft> | undefined) ?? {};
  const now = Date.now();
  let changed = false;
  for (const [id, draft] of Object.entries(drafts)) {
    if (draft.expiresAt <= now) {
      delete drafts[id];
      changed = true;
    }
  }
  if (changed) await chrome.storage.session.set({ [DRAFTS_KEY]: drafts });
  return drafts;
}

export async function putEncryptedDraft(
  draft: EncryptedCredentialDraft,
): Promise<void> {
  const drafts = await getDraftMap();
  drafts[draft.id] = draft;
  await chrome.storage.session.set({ [DRAFTS_KEY]: drafts });
}

export async function getEncryptedDraft(
  draftId: string,
): Promise<EncryptedCredentialDraft | undefined> {
  return (await getDraftMap())[draftId];
}

export async function findEncryptedDraft(
  tabId: number,
  origin: string,
): Promise<EncryptedCredentialDraft | undefined> {
  return Object.values(await getDraftMap()).find(
    (draft) => draft.tabId === tabId && draft.origin === origin,
  );
}

export async function deleteEncryptedDraft(draftId: string): Promise<void> {
  const drafts = await getDraftMap();
  delete drafts[draftId];
  await chrome.storage.session.set({ [DRAFTS_KEY]: drafts });
}

export async function storeConflictHandoff(
  handoff: ConflictHandoff,
): Promise<void> {
  await chrome.storage.session.set({ [CONFLICT_HANDOFF_KEY]: handoff });
}

export async function getConflictHandoff(): Promise<ConflictHandoff | null> {
  const result = await chrome.storage.session.get(CONFLICT_HANDOFF_KEY);
  const handoff = result[CONFLICT_HANDOFF_KEY] as
    Partial<ConflictHandoff> | undefined;
  if (
    !handoff ||
    !Number.isInteger(handoff.tabId) ||
    typeof handoff.uid !== "string" ||
    handoff.uid.length === 0 ||
    typeof handoff.expiresAt !== "number" ||
    isSessionExpired(handoff.expiresAt) ||
    (handoff.conflictId !== undefined && typeof handoff.conflictId !== "string")
  ) {
    await clearConflictHandoff();
    return null;
  }
  return handoff as ConflictHandoff;
}

export async function clearConflictHandoff(): Promise<void> {
  await chrome.storage.session.remove(CONFLICT_HANDOFF_KEY);
}
