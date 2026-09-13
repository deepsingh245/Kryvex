import { act, renderHook, waitFor } from "@testing-library/react-native";
import { generateKey } from "@kryvex/crypto";
import {
  createVaultItem,
  fetchVaultItems,
  softDeleteVaultItem,
  updateVaultItem,
} from "@kryvex/firebase";
import type { ItemContent } from "@kryvex/types";
import { encryptItemContent } from "@kryvex/vault";
import { useVaultItems } from "./useVaultItems";
import { useVault } from "@/providers/VaultProvider";

jest.mock("@kryvex/firebase", () => ({
  initializeKryvexFirebaseNative: jest.fn(() => ({ firestore: {} })),
  createVaultItem: jest.fn(),
  fetchVaultItems: jest.fn(),
  updateVaultItem: jest.fn(),
  softDeleteVaultItem: jest.fn(),
}));

// initializeKryvexFirebaseNative is already mocked above and ignores its
// persistence argument, so the real getReactNativePersistence never needs
// to work here — only stubbed so getServices() doesn't crash resolving it.
// (Under Jest, @firebase/auth's export-conditions resolution doesn't pick
// its react-native build the way Metro does at runtime.)
jest.mock("@firebase/auth", () => ({
  getReactNativePersistence: jest.fn(() => ({})),
}));

jest.mock("@/providers/VaultProvider", () => ({
  useVault: jest.fn(),
}));

const mockedUseVault = jest.mocked(useVault);
const mockedFetchVaultItems = jest.mocked(fetchVaultItems);
const mockedCreateVaultItem = jest.mocked(createVaultItem);
const mockedUpdateVaultItem = jest.mocked(updateVaultItem);
const mockedSoftDeleteVaultItem = jest.mocked(softDeleteVaultItem);

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

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseVault.mockReturnValue({
    state: UNLOCKED_STATE,
    signUp: jest.fn(),
    signIn: jest.fn(),
    unlock: jest.fn(),
    signOut: jest.fn(),
  });
});

describe("useVaultItems — load", () => {
  it("fetches and decrypts items on mount when UNLOCKED", async () => {
    mockedFetchVaultItems.mockResolvedValue([rawDocFor(LOGIN_CONTENT)]);
    const { result } = await renderHook(() => useVaultItems());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    const item = result.current.items[0]!;
    expect(item.decryptFailed).toBe(false);
    if (!item.decryptFailed) {
      expect(item.content.title).toBe("GitHub");
    }
  });

  it("isolates a per-item decrypt failure instead of throwing or dropping the whole list", async () => {
    const tamperedDoc = rawDocFor(LOGIN_CONTENT);
    tamperedDoc.encryptedData = {
      ...(tamperedDoc.encryptedData as object),
      ciphertext: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    };
    mockedFetchVaultItems.mockResolvedValue([
      tamperedDoc,
      rawDocFor(LOGIN_CONTENT, { id: "item2" }),
    ]);

    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.items).toHaveLength(2);
    const failed = result.current.items.find((i) => i.id === "item1")!;
    const ok = result.current.items.find((i) => i.id === "item2")!;
    expect(failed.decryptFailed).toBe(true);
    expect(ok.decryptFailed).toBe(false);
  });
});

describe("useVaultItems — mutations", () => {
  it("createItem wraps/encrypts content and calls createVaultItem", async () => {
    mockedFetchVaultItems.mockResolvedValue([]);
    mockedCreateVaultItem.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(result.current.loading).toBe(false));

    let id = "";
    await act(async () => {
      id = await result.current.createItem("login", LOGIN_CONTENT);
    });

    expect(id).toBeTruthy();
    expect(mockedCreateVaultItem).toHaveBeenCalledTimes(1);
    const [, uid, itemId, envelope] = mockedCreateVaultItem.mock.calls[0]!;
    expect(uid).toBe("alice");
    expect(itemId).toBe(id);
    expect(envelope).toMatchObject({
      ownerId: "alice",
      type: "login",
      revision: 0,
      favorite: false,
    });
  });

  it("updateItem re-encrypts under the existing item key and increments revision", async () => {
    mockedFetchVaultItems.mockResolvedValue([rawDocFor(LOGIN_CONTENT)]);
    mockedUpdateVaultItem.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateItem("item1", {
        ...LOGIN_CONTENT,
        title: "GitHub (work)",
      });
    });

    expect(mockedUpdateVaultItem).toHaveBeenCalledTimes(1);
    const [, , , envelope] = mockedUpdateVaultItem.mock.calls[0]!;
    expect(envelope).toMatchObject({ id: "item1", revision: 1 });
  });

  it("toggleFavorite flips favorite and increments revision without re-encrypting", async () => {
    mockedFetchVaultItems.mockResolvedValue([rawDocFor(LOGIN_CONTENT)]);
    mockedUpdateVaultItem.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.toggleFavorite("item1");
    });

    expect(mockedUpdateVaultItem).toHaveBeenCalledTimes(1);
    const [, , , envelope] = mockedUpdateVaultItem.mock.calls[0]!;
    expect(envelope).toMatchObject({
      id: "item1",
      favorite: true,
      revision: 1,
    });
  });

  it("softDeleteItem marks deleted:true and increments revision", async () => {
    mockedFetchVaultItems.mockResolvedValue([rawDocFor(LOGIN_CONTENT)]);
    mockedSoftDeleteVaultItem.mockResolvedValue(undefined);
    const { result } = await renderHook(() => useVaultItems());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.softDeleteItem("item1");
    });

    expect(mockedSoftDeleteVaultItem).toHaveBeenCalledTimes(1);
    const [, , , envelope] = mockedSoftDeleteVaultItem.mock.calls[0]!;
    expect(envelope).toMatchObject({
      id: "item1",
      deleted: true,
      revision: 1,
    });
  });
});
