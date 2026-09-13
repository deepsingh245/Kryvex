import { act, renderHook, waitFor } from "@testing-library/react-native";
import { generateKey } from "@kryvex/crypto";
import {
  createVaultItem,
  fetchVaultItem,
  subscribeToVaultItems,
  updateVaultItem,
} from "@kryvex/firebase";
import type { ItemContent, VaultItemDocument } from "@kryvex/types";
import { encryptItemContent } from "@kryvex/vault";
import { useVaultItems } from "./useVaultItems";
import { createAsyncStorageItemStore } from "@/lib/localItemStore";
import { useVault } from "@/providers/VaultProvider";
import { useOnlineStatus } from "./useOnlineStatus";

jest.mock("@kryvex/firebase", () => ({
  initializeKryvexFirebaseNative: jest.fn(() => ({ firestore: {} })),
  createVaultItem: jest.fn(),
  updateVaultItem: jest.fn(),
  fetchVaultItem: jest.fn(),
  subscribeToVaultItems: jest.fn(),
}));

// initializeKryvexFirebaseNative is already mocked above and ignores its
// persistence argument, so the real getReactNativePersistence never needs
// to work here — only stubbed so getServices() doesn't crash resolving it.
jest.mock("@firebase/auth", () => ({
  getReactNativePersistence: jest.fn(() => ({})),
}));

jest.mock("@/lib/localItemStore", () => ({
  createAsyncStorageItemStore: jest.fn(),
}));

jest.mock("./useOnlineStatus", () => ({
  useOnlineStatus: jest.fn(),
}));

jest.mock("@/providers/VaultProvider", () => ({
  useVault: jest.fn(),
}));

const mockedUseVault = jest.mocked(useVault);
const mockedCreateAsyncStorageItemStore = jest.mocked(
  createAsyncStorageItemStore,
);
const mockedSubscribeToVaultItems = jest.mocked(subscribeToVaultItems);
const mockedCreateVaultItem = jest.mocked(createVaultItem);
const mockedUpdateVaultItem = jest.mocked(updateVaultItem);
const mockedFetchVaultItem = jest.mocked(fetchVaultItem);
const mockedUseOnlineStatus = jest.mocked(useOnlineStatus);

const vaultEncryptionKey = generateKey();
const UNLOCKED_STATE = {
  status: "UNLOCKED" as const,
  user: { uid: "alice", email: "a@b.com" },
  stretchedMasterKey: new Uint8Array(),
  vaultEncryptionKey,
};

const LOGIN_CONTENT: ItemContent = {
  type: "login",
  title: "GitHub",
  tags: [],
  customFields: [],
  username: "alice",
  password: "hunter2",
  websites: [],
};

function rawDocFor(
  content: ItemContent,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const { wrappedItemKey, encryptedData } = encryptItemContent(
    vaultEncryptionKey,
    content,
  );
  return {
    id: "item1",
    ownerId: "alice",
    type: content.type,
    revision: 0,
    updatedAt: null,
    createdAt: null,
    deleted: false,
    favorite: false,
    wrappedItemKey,
    encryptedData,
    attachmentRefs: [],
    ...overrides,
  };
}

function permissionDeniedError(): Error {
  return Object.assign(new Error("The caller does not have permission"), {
    code: "permission-denied",
  });
}

/** A simple in-memory fake matching the VaultItemLocalStore interface. */
function createFakeLocalStore() {
  const byUid = new Map<string, Map<string, VaultItemDocument>>();
  return {
    async getAll(uid: string) {
      return Array.from(byUid.get(uid)?.values() ?? []);
    },
    async putMany(uid: string, items: VaultItemDocument[]) {
      const bucket = byUid.get(uid) ?? new Map<string, VaultItemDocument>();
      for (const item of items) bucket.set(item.id, item);
      byUid.set(uid, bucket);
    },
    async remove(uid: string, itemId: string) {
      byUid.get(uid)?.delete(itemId);
    },
    async clear(uid: string) {
      byUid.delete(uid);
    },
  };
}

let capturedOnNext: ((docs: Record<string, unknown>[]) => void) | undefined;
let capturedOnError: ((error: unknown) => void) | undefined;
const unsubscribe = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnNext = undefined;
  capturedOnError = undefined;
  mockedUseVault.mockReturnValue({
    state: UNLOCKED_STATE,
    signUp: jest.fn(),
    signIn: jest.fn(),
    unlock: jest.fn(),
    signOut: jest.fn(),
  });
  mockedCreateAsyncStorageItemStore.mockReturnValue(createFakeLocalStore());
  mockedUseOnlineStatus.mockReturnValue(true);
  mockedSubscribeToVaultItems.mockImplementation(
    (_fs, _uid, onNext, onError) => {
      capturedOnNext = onNext;
      capturedOnError = onError;
      return unsubscribe;
    },
  );
});

describe("useVaultItems — offline-first load", () => {
  it("hydrates from the local cache before the listener delivers anything", async () => {
    const store = createFakeLocalStore();
    const { wrappedItemKey, encryptedData } = encryptItemContent(
      vaultEncryptionKey,
      LOGIN_CONTENT,
    );
    await store.putMany("alice", [
      {
        id: "item1",
        ownerId: "alice",
        type: "login",
        revision: 0,
        updatedAt: null,
        createdAt: null,
        deleted: false,
        favorite: false,
        wrappedItemKey,
        encryptedData,
        attachmentRefs: [],
      },
    ]);
    mockedCreateAsyncStorageItemStore.mockReturnValue(store);

    const { result } = await renderHook(() => useVaultItems());

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    const item = result.current.items[0]!;
    expect(item.decryptFailed).toBe(false);
    if (!item.decryptFailed) expect(item.content.title).toBe("GitHub");
  });

  it("merges documents delivered by the real-time listener and persists them locally", async () => {
    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(capturedOnNext).toBeDefined());

    await act(() => {
      capturedOnNext!([rawDocFor(LOGIN_CONTENT)]);
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
  });

  it("unsubscribes the listener on unmount", async () => {
    const { unmount } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(capturedOnNext).toBeDefined());
    await unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the listener reports an error", async () => {
    await renderHook(() => useVaultItems());
    await waitFor(() => expect(capturedOnError).toBeDefined());
    expect(() => capturedOnError!(new Error("listener failed"))).not.toThrow();
  });
});

describe("useVaultItems — writes", () => {
  it("createItem calls createVaultItem and reflects the new item immediately", async () => {
    mockedCreateVaultItem.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(capturedOnNext).toBeDefined());

    let id = "";
    await act(async () => {
      id = await result.current.createItem("login", LOGIN_CONTENT);
    });

    expect(id).toBeTruthy();
    expect(mockedCreateVaultItem).toHaveBeenCalledTimes(1);
    expect(result.current.items.some((i) => i.id === id)).toBe(true);
  });

  it("a permission-denied rejection produces a conflict", async () => {
    mockedUpdateVaultItem.mockRejectedValue(permissionDeniedError());
    const serverDoc = rawDocFor(LOGIN_CONTENT, { revision: 5 });
    mockedFetchVaultItem.mockResolvedValue(serverDoc);

    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(capturedOnNext).toBeDefined());

    await act(() => {
      capturedOnNext!([rawDocFor(LOGIN_CONTENT, { revision: 0 })]);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem("item1", {
        ...LOGIN_CONTENT,
        title: "GitHub (renamed)",
      });
    });

    await waitFor(() => expect(result.current.conflicts).toHaveLength(1));
    const conflict = result.current.conflicts[0]!;
    expect(conflict.localContent?.title).toBe("GitHub (renamed)");
    expect(conflict.serverContent?.title).toBe("GitHub");
  });

  it("a non-permission-denied failure leaves the write pending for retry, not a conflict", async () => {
    mockedUpdateVaultItem.mockRejectedValue(new Error("network unavailable"));
    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(capturedOnNext).toBeDefined());

    await act(() => {
      capturedOnNext!([rawDocFor(LOGIN_CONTENT, { revision: 0 })]);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.toggleFavorite("item1");
    });

    expect(result.current.conflicts).toHaveLength(0);
  });
});

describe("useVaultItems — conflict resolution", () => {
  async function setupConflict() {
    mockedUpdateVaultItem.mockRejectedValueOnce(permissionDeniedError());
    const serverDoc = rawDocFor(LOGIN_CONTENT, { revision: 5 });
    mockedFetchVaultItem.mockResolvedValue(serverDoc);

    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(capturedOnNext).toBeDefined());

    await act(() => {
      capturedOnNext!([rawDocFor(LOGIN_CONTENT, { revision: 0 })]);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.updateItem("item1", {
        ...LOGIN_CONTENT,
        title: "Mine",
      });
    });
    await waitFor(() => expect(result.current.conflicts).toHaveLength(1));

    return result;
  }

  it("keepMine re-writes the local content under the server's current revision", async () => {
    mockedUpdateVaultItem.mockResolvedValue(undefined);
    const result = await setupConflict();

    await act(async () => {
      await result.current.resolveConflict("item1", "keepMine");
    });

    expect(result.current.conflicts).toHaveLength(0);
    const calls = mockedUpdateVaultItem.mock.calls;
    const lastCall = calls[calls.length - 1]!;
    expect(lastCall[3]).toMatchObject({ id: "item1", revision: 6 });
  });

  it("keepServer dismisses the conflict without writing", async () => {
    const result = await setupConflict();
    const writesBefore = mockedUpdateVaultItem.mock.calls.length;

    await act(async () => {
      await result.current.resolveConflict("item1", "keepServer");
    });

    expect(result.current.conflicts).toHaveLength(0);
    expect(mockedUpdateVaultItem.mock.calls.length).toBe(writesBefore);
    const item = result.current.items.find((i) => i.id === "item1")!;
    if (!item.decryptFailed) expect(item.content.title).toBe("GitHub");
  });

  it("keepBoth creates a brand-new item and leaves the original conflict-free", async () => {
    mockedCreateVaultItem.mockResolvedValue(undefined);
    const result = await setupConflict();

    await act(async () => {
      await result.current.resolveConflict("item1", "keepBoth");
    });

    expect(result.current.conflicts).toHaveLength(0);
    expect(mockedCreateVaultItem).toHaveBeenCalledTimes(1);
    expect(result.current.items.length).toBeGreaterThanOrEqual(2);
  });
});

describe("useVaultItems — reconnect retry", () => {
  it("retries pending writes once isOnline becomes true", async () => {
    mockedUseOnlineStatus.mockReturnValue(false);
    mockedUpdateVaultItem.mockRejectedValueOnce(new Error("offline"));

    const { result, rerender } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(capturedOnNext).toBeDefined());

    await act(() => {
      capturedOnNext!([rawDocFor(LOGIN_CONTENT, { revision: 0 })]);
    });
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    await act(async () => {
      await result.current.toggleFavorite("item1");
    });
    expect(mockedUpdateVaultItem).toHaveBeenCalledTimes(1);

    mockedUpdateVaultItem.mockResolvedValue(undefined);
    mockedUseOnlineStatus.mockReturnValue(true);
    rerender({});

    await waitFor(() =>
      expect(mockedUpdateVaultItem.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
  });
});
