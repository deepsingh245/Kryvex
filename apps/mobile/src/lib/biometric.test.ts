import MockAsyncStorage from "@react-native-async-storage/async-storage/jest";
import { generateKey } from "@kryvex/crypto";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import {
  BiometricUnsupportedError,
  clearAllBiometric,
  enrollBiometric,
  hasBiometricEnrollment,
  isBiometricSupported,
  unlockWithBiometric,
} from "./biometric";

const mockSecureValues = new Map<string, string>();
jest.mock("@react-native-async-storage/async-storage", () => MockAsyncStorage);
jest.mock("expo-secure-store", () => ({
  deleteItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));
jest.mock("expo-local-authentication", () => ({
  SecurityLevel: {
    NONE: 0,
    SECRET: 1,
    BIOMETRIC_WEAK: 2,
    BIOMETRIC_STRONG: 3,
  },
  getEnrolledLevelAsync: jest.fn(),
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
}));

const mockDeleteItemAsync = jest.mocked(SecureStore.deleteItemAsync);
const mockGetItemAsync = jest.mocked(SecureStore.getItemAsync);
const mockIsAvailableAsync = jest.mocked(SecureStore.isAvailableAsync);
const mockSetItemAsync = jest.mocked(SecureStore.setItemAsync);
const mockGetEnrolledLevelAsync = jest.mocked(
  LocalAuthentication.getEnrolledLevelAsync,
);
const mockHasHardwareAsync = jest.mocked(LocalAuthentication.hasHardwareAsync);
const mockIsEnrolledAsync = jest.mocked(LocalAuthentication.isEnrolledAsync);

describe("native biometric unlock", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockSecureValues.clear();
    await MockAsyncStorage.clear();
    mockDeleteItemAsync.mockImplementation(async (key: string) => {
      mockSecureValues.delete(key);
    });
    mockGetItemAsync.mockImplementation(
      async (key: string) => mockSecureValues.get(key) ?? null,
    );
    mockSetItemAsync.mockImplementation(async (key: string, value: string) => {
      mockSecureValues.set(key, value);
    });
    mockIsAvailableAsync.mockResolvedValue(true);
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(true);
    mockGetEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG,
    );
  });

  it("requires enrolled strong biometrics and SecureStore", async () => {
    expect(await isBiometricSupported()).toBe(true);

    mockGetEnrolledLevelAsync.mockResolvedValue(
      LocalAuthentication.SecurityLevel.BIOMETRIC_WEAK,
    );
    expect(await isBiometricSupported()).toBe(false);
  });

  it("round-trips the vault key through authenticated SecureStore", async () => {
    const vaultKey = generateKey();
    await enrollBiometric("u1", vaultKey);

    expect(await hasBiometricEnrollment("u1")).toBe(true);
    expect(await unlockWithBiometric("u1")).toEqual(vaultKey);
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      "kryvex.biometric.v1",
      expect.any(String),
      expect.objectContaining({ requireAuthentication: true }),
    );
    expect(mockGetItemAsync).toHaveBeenCalledWith(
      "kryvex.biometric.v1",
      expect.objectContaining({ requireAuthentication: true }),
    );
  });

  it("does not expose another account's enrollment", async () => {
    await enrollBiometric("u1", generateKey());

    expect(await hasBiometricEnrollment("u2")).toBe(false);
    await expect(unlockWithBiometric("u2")).rejects.toBeInstanceOf(
      BiometricUnsupportedError,
    );
  });

  it("rejects enrollment when strong biometrics are unavailable", async () => {
    mockIsEnrolledAsync.mockResolvedValue(false);

    await expect(enrollBiometric("u1", generateKey())).rejects.toBeInstanceOf(
      BiometricUnsupportedError,
    );
    expect(await hasBiometricEnrollment("u1")).toBe(false);
  });

  it("clears both the secure value and the non-secret marker", async () => {
    await enrollBiometric("u1", generateKey());
    await clearAllBiometric();

    expect(await hasBiometricEnrollment("u1")).toBe(false);
    expect(mockSecureValues.size).toBe(0);
  });
});
