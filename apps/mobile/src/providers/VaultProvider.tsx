import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
// Imported from "@firebase/auth" (the scoped package), not the "firebase"
// wrapper's "firebase/auth" subpath: the wrapper hoists its "types" export
// condition outside the node/browser/react-native branches, so bundler-mode
// TypeScript resolves getReactNativePersistence's *type* via the generic
// branch regardless of `customConditions: ["react-native"]` (already set by
// expo/tsconfig.base) and reports it missing — even though Metro correctly
// picks the react-native build at runtime either way. Importing the scoped
// package directly sidesteps the wrapper's export-map indirection.
import { getReactNativePersistence } from "@firebase/auth";
import {
  DEFAULT_KDF_PARAMS,
  bytesToHex,
  decryptBytes,
  deriveAuthAndStretchedKey,
  deriveKdfMaterial,
  encryptBytes,
  generateKdfSalt,
  generateKey,
  hexToBytes,
  wipeBytes,
  type KdfParams,
} from "@kryvex/crypto";
import {
  confirmVaultRecovery,
  createUserProfileDocument,
  fetchUserProfileDocument,
  initializeKryvexFirebaseNative,
  observeAuthState,
  resolveKdfParamsForEmail,
  resolveRecoveryEnvelopeForEmail,
  sendVaultRecoveryEmail,
  signInWithAuthSecret,
  signOutKryvex,
  signUpWithAuthSecret,
  updateUserProfileDocument,
  verifyRecoveryCode,
  type KryvexFirebaseServices,
} from "@kryvex/firebase";
import type { EncryptedEnvelope, UserProfileSettings } from "@kryvex/types";
import { userProfileSettingsSchema } from "@kryvex/validation";
import {
  formatRecoveryKey,
  initialLockState,
  lockStateReducer,
  parseRecoveryKey,
  type LockState,
} from "@kryvex/vault";
import {
  mobileFirebaseConfig,
  mobileFirebaseEmulatorEnv,
  mobileWebRecoveryUrl,
} from "@/lib/firebaseConfig";
import {
  clearAllBiometric,
  enrollBiometric,
  unlockWithBiometric as unlockWithBiometricKey,
} from "@/lib/biometric";
import { clearCopiedSecret } from "@/lib/clipboard";
import { useAutoLock } from "@/hooks/useAutoLock";
import { DEFAULT_SETTINGS, VaultSettingsContext } from "./vaultSettings";

// See apps/web's VaultProvider for the full rationale of this shape — this
// file mirrors it, swapping only the RN-specific initializer (persistence
// wiring) and env-var prefix.
function getServices(): KryvexFirebaseServices {
  return initializeKryvexFirebaseNative(
    mobileFirebaseConfig,
    mobileFirebaseEmulatorEnv,
    getReactNativePersistence(AsyncStorage),
  );
}

interface KdfParamsRecord {
  kdfSalt: string;
  kdfParams: KdfParams;
  protectedVaultKey?: EncryptedEnvelope;
  settings?: unknown;
}

// Same "never trust the settings sub-object structurally" precedent as
// apps/web's VaultProvider: malformed/missing settings fall back to
// DEFAULT_SETTINGS and never block sign-in/unlock.
function parseSettings(raw: unknown): UserProfileSettings | undefined {
  const parsed = userProfileSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

interface RecoveryEnvelopeRecord {
  protectedVaultKeyByRecovery?: EncryptedEnvelope;
}

/**
 * Fail-closed master-password re-verification against the server envelope
 * (AEAD tag mismatch throws). Wipes every derived buffer before returning.
 */
async function verifyMasterPassword(
  profile: KdfParamsRecord,
  masterPassword: string,
): Promise<void> {
  if (!profile.protectedVaultKey) throw new Error("Profile not found.");
  const { masterKey } = await deriveKdfMaterial(
    masterPassword,
    hexToBytes(profile.kdfSalt),
    profile.kdfParams,
  );
  const { stretchedMasterKey } = deriveAuthAndStretchedKey(masterKey);
  wipeBytes(masterKey);
  try {
    const verifiedVaultKey = decryptBytes(
      stretchedMasterKey,
      profile.protectedVaultKey,
    );
    wipeBytes(verifiedVaultKey);
  } catch {
    throw new Error("Incorrect master password.");
  } finally {
    wipeBytes(stretchedMasterKey);
  }
}

/** Wraps the VEK under a fresh Recovery Key — docs/RECOVERY.md §2. */
function wrapWithNewRecoveryKey(vaultEncryptionKey: Uint8Array): {
  recoveryKey: string;
  protectedVaultKeyByRecovery: EncryptedEnvelope;
} {
  const recoveryKeyBytes = generateKey();
  const protectedVaultKeyByRecovery = encryptBytes(
    recoveryKeyBytes,
    vaultEncryptionKey,
  );
  const recoveryKey = formatRecoveryKey(recoveryKeyBytes);
  wipeBytes(recoveryKeyBytes);
  return { recoveryKey, protectedVaultKeyByRecovery };
}

export type LockReason = "manual" | "timeout" | "background";

interface VaultContextValue {
  state: LockState;
  settings: UserProfileSettings | undefined;
  signUp: (
    email: string,
    masterPassword: string,
  ) => Promise<{ recoveryKey: string }>;
  signIn: (email: string, masterPassword: string) => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  unlockWithBiometric: () => Promise<void>;
  enableBiometric: (masterPassword: string) => Promise<void>;
  disableBiometric: () => Promise<void>;
  lock: (reason?: LockReason) => void;
  /** Resets the auto-lock idle timer — wired to every touch at the root. */
  reportActivity: () => void;
  updateSettings: (patch: Partial<UserProfileSettings>) => Promise<void>;
  /**
   * Re-verifies the master password, then replaces this account's Recovery
   * Key (or creates one for accounts that never had it). The old kit stops
   * working.
   */
  regenerateRecoveryKey: (
    masterPassword: string,
  ) => Promise<{ recoveryKey: string }>;
  sendRecoveryEmail: (email: string) => Promise<void>;
  recoverVault: (
    oobCode: string,
    recoveryKeyInput: string,
    newMasterPassword: string,
  ) => Promise<{ recoveryKey: string }>;
  signOut: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(lockStateReducer, initialLockState);
  // Local React state, not part of the shared LockState — same as web.
  const [settings, setSettings] = useState<UserProfileSettings | undefined>(
    undefined,
  );
  // See apps/web's VaultProvider for the full rationale of this shape.
  const pendingUnlock = useRef<{
    stretchedMasterKey: Uint8Array;
    resolveVaultKey: (uid: string) => Promise<Uint8Array>;
  } | null>(null);

  useEffect(() => {
    const services = getServices();
    return observeAuthState(services.auth, (user) => {
      if (!user) {
        dispatch({ type: "FIREBASE_SIGNED_OUT" });
        return;
      }
      dispatch({ type: "FIREBASE_SIGNED_IN", user });
      const pending = pendingUnlock.current;
      if (pending) {
        pendingUnlock.current = null;
        dispatch({ type: "UNLOCK_REQUESTED" });
        pending
          .resolveVaultKey(user.uid)
          .then((vaultEncryptionKey) => {
            dispatch({
              type: "UNLOCK_SUCCEEDED",
              stretchedMasterKey: pending.stretchedMasterKey,
              vaultEncryptionKey,
            });
          })
          .catch(() => {
            dispatch({ type: "UNLOCK_FAILED" });
          });
      }
    });
  }, []);

  function lock(reason: LockReason = "manual") {
    // The shared reducer wipes both in-memory key buffers on LOCK_REQUESTED.
    dispatch({ type: "LOCK_REQUESTED", reason });
    dispatch({ type: "LOCK_COMPLETED" });
    // Best-effort: a secret copied from the vault shouldn't outlive the
    // unlocked session if the auto-clear timer hasn't fired yet.
    void clearCopiedSecret();
  }

  // See useAutoLock for the foreground/background policy (and why mobile
  // deliberately differs from web's lock-on-tab-hidden).
  const reportActivity = useAutoLock(
    state.status === "UNLOCKED",
    settings?.autoLockMinutes ?? DEFAULT_SETTINGS.autoLockMinutes,
    lock,
  );

  const value: VaultContextValue = {
    state,
    settings,

    async signUp(email, masterPassword) {
      const services = getServices();
      const salt = generateKdfSalt();
      const { masterKey } = await deriveKdfMaterial(
        masterPassword,
        salt,
        DEFAULT_KDF_PARAMS,
      );
      const { authSecret, stretchedMasterKey } =
        deriveAuthAndStretchedKey(masterKey);
      wipeBytes(masterKey);
      const vaultEncryptionKey = generateKey();
      const protectedVaultKey = encryptBytes(
        stretchedMasterKey,
        vaultEncryptionKey,
      );
      // Second, independent wrapping of the same VEK — never transmitted or
      // stored unwrapped; shown to the user exactly once by sign-up.tsx.
      const { recoveryKey, protectedVaultKeyByRecovery } =
        wrapWithNewRecoveryKey(vaultEncryptionKey);
      pendingUnlock.current = {
        stretchedMasterKey,
        resolveVaultKey: async () => vaultEncryptionKey,
      };

      const user = await signUpWithAuthSecret(services.auth, email, authSecret);
      await createUserProfileDocument(services.firestore, user.uid, {
        email,
        kdfSalt: bytesToHex(salt),
        kdfParams: DEFAULT_KDF_PARAMS,
        protectedVaultKey,
        protectedVaultKeyByRecovery,
        settings: DEFAULT_SETTINGS,
      });
      setSettings(DEFAULT_SETTINGS);
      return { recoveryKey };
    },

    async signIn(email, masterPassword) {
      const services = getServices();
      const params = (await resolveKdfParamsForEmail(
        services.functions,
        email,
      )) as KdfParamsRecord | null;
      if (!params) {
        throw new Error("Invalid email or password.");
      }
      const { masterKey } = await deriveKdfMaterial(
        masterPassword,
        hexToBytes(params.kdfSalt),
        params.kdfParams,
      );
      const { authSecret, stretchedMasterKey } =
        deriveAuthAndStretchedKey(masterKey);
      wipeBytes(masterKey);
      pendingUnlock.current = {
        stretchedMasterKey,
        resolveVaultKey: async (uid) => {
          const profile = (await fetchUserProfileDocument(
            services.firestore,
            uid,
          )) as KdfParamsRecord | undefined;
          if (!profile?.protectedVaultKey) {
            throw new Error("Unable to decrypt vault item.");
          }
          setSettings(parseSettings(profile.settings));
          return decryptBytes(stretchedMasterKey, profile.protectedVaultKey);
        },
      };
      await signInWithAuthSecret(services.auth, email, authSecret);
    },

    async unlock(masterPassword) {
      if (state.status !== "AUTHENTICATED_LOCKED") return;
      const services = getServices();
      const { user } = state;
      dispatch({ type: "UNLOCK_REQUESTED" });
      try {
        const profile = (await fetchUserProfileDocument(
          services.firestore,
          user.uid,
        )) as KdfParamsRecord | undefined;
        if (!profile?.protectedVaultKey) throw new Error("Profile not found.");
        const { masterKey } = await deriveKdfMaterial(
          masterPassword,
          hexToBytes(profile.kdfSalt),
          profile.kdfParams,
        );
        const { stretchedMasterKey } = deriveAuthAndStretchedKey(masterKey);
        wipeBytes(masterKey);
        // Local AEAD unwrap is the authoritative "wrong password" signal —
        // no need to re-authenticate against Firebase on every unlock.
        const vaultEncryptionKey = decryptBytes(
          stretchedMasterKey,
          profile.protectedVaultKey,
        );
        setSettings(parseSettings(profile.settings));
        dispatch({
          type: "UNLOCK_SUCCEEDED",
          stretchedMasterKey,
          vaultEncryptionKey,
        });
      } catch (err) {
        dispatch({ type: "UNLOCK_FAILED" });
        throw err;
      }
    },

    async unlockWithBiometric() {
      if (state.status !== "AUTHENTICATED_LOCKED") return;
      const { user } = state;
      dispatch({ type: "UNLOCK_REQUESTED" });
      try {
        // SecureStore performs the Android Biometric Prompt and releases this
        // device-local VEK only after Keystore user authentication succeeds.
        const vaultEncryptionKey = await unlockWithBiometricKey(user.uid);
        // Settings only — the key above never touches the server. Best-effort
        // so offline biometric unlock keeps working on DEFAULT_SETTINGS.
        const profile = (await fetchUserProfileDocument(
          getServices().firestore,
          user.uid,
        ).catch(() => undefined)) as KdfParamsRecord | undefined;
        setSettings(parseSettings(profile?.settings));
        dispatch({
          type: "UNLOCK_SUCCEEDED",
          // Biometric unlock has no master-password-derived key. Nothing in
          // the unlocked mobile flow consumes it; retain the shared state
          // shape without persisting or reconstructing the master password.
          stretchedMasterKey: new Uint8Array(32),
          vaultEncryptionKey,
        });
      } catch (err) {
        dispatch({ type: "UNLOCK_FAILED" });
        throw err;
      }
    },

    async enableBiometric(masterPassword) {
      if (state.status !== "UNLOCKED") throw new Error("Vault is locked.");
      const services = getServices();
      const { user, vaultEncryptionKey } = state;
      const profile = (await fetchUserProfileDocument(
        services.firestore,
        user.uid,
      )) as KdfParamsRecord | undefined;
      if (!profile) throw new Error("Profile not found.");
      await verifyMasterPassword(profile, masterPassword);

      await enrollBiometric(user.uid, vaultEncryptionKey);
      await value.updateSettings({ biometricUnlockEnabled: true });
    },

    async disableBiometric() {
      if (state.status !== "UNLOCKED") throw new Error("Vault is locked.");
      await clearAllBiometric();
      await value.updateSettings({ biometricUnlockEnabled: false });
    },

    lock,

    reportActivity,

    async updateSettings(patch) {
      if (state.status !== "UNLOCKED") throw new Error("Vault is locked.");
      const next: UserProfileSettings = {
        ...(settings ?? DEFAULT_SETTINGS),
        ...patch,
      };
      await updateUserProfileDocument(getServices().firestore, state.user.uid, {
        settings: next,
      });
      setSettings(next);
    },

    async regenerateRecoveryKey(masterPassword) {
      if (state.status !== "UNLOCKED") throw new Error("Vault is locked.");
      const services = getServices();
      const { user, vaultEncryptionKey } = state;
      const profile = (await fetchUserProfileDocument(
        services.firestore,
        user.uid,
      )) as KdfParamsRecord | undefined;
      if (!profile) throw new Error("Profile not found.");
      // Possession of an unlocked device alone must not be enough to
      // silently invalidate the user's existing Emergency Kit.
      await verifyMasterPassword(profile, masterPassword);

      const { recoveryKey, protectedVaultKeyByRecovery } =
        wrapWithNewRecoveryKey(vaultEncryptionKey);
      await updateUserProfileDocument(services.firestore, user.uid, {
        protectedVaultKeyByRecovery,
      });
      return { recoveryKey };
    },

    async sendRecoveryEmail(email) {
      await sendVaultRecoveryEmail(
        getServices().auth,
        email,
        mobileWebRecoveryUrl,
      );
    },

    // Ported from apps/web's VaultProvider — see docs/RECOVERY.md §3. Needs
    // both factors: the email oobCode (inbox control) and the Recovery Key.
    async recoverVault(oobCode, recoveryKeyInput, newMasterPassword) {
      const services = getServices();
      const email = await verifyRecoveryCode(services.auth, oobCode);
      // The shared reducer ignores FIREBASE_SIGNED_IN unless SIGNED_OUT, so
      // recovering account B while this device holds account A would pair
      // B's key with A's identity. Sign A out first (also drops A's
      // biometric copy, same as a normal sign-out).
      if (
        state.status !== "SIGNED_OUT" &&
        state.user.email?.toLowerCase() !== email.toLowerCase()
      ) {
        await value.signOut();
      }

      const envelope = (await resolveRecoveryEnvelopeForEmail(
        services.functions,
        email,
      )) as RecoveryEnvelopeRecord | null;
      if (!envelope?.protectedVaultKeyByRecovery) {
        throw new Error("Recovery isn't available for this account.");
      }

      const recoveryKeyBytes = parseRecoveryKey(recoveryKeyInput);
      let vaultEncryptionKey: Uint8Array;
      try {
        vaultEncryptionKey = decryptBytes(
          recoveryKeyBytes,
          envelope.protectedVaultKeyByRecovery,
        );
      } finally {
        wipeBytes(recoveryKeyBytes);
      }

      const newSalt = generateKdfSalt();
      const { masterKey } = await deriveKdfMaterial(
        newMasterPassword,
        newSalt,
        DEFAULT_KDF_PARAMS,
      );
      const { authSecret: newAuthSecret, stretchedMasterKey } =
        deriveAuthAndStretchedKey(masterKey);
      wipeBytes(masterKey);
      const protectedVaultKey = encryptBytes(
        stretchedMasterKey,
        vaultEncryptionKey,
      );
      // The used kit is spent — issue a fresh one (docs/RECOVERY.md §3.5).
      const { recoveryKey, protectedVaultKeyByRecovery } =
        wrapWithNewRecoveryKey(vaultEncryptionKey);

      pendingUnlock.current = {
        stretchedMasterKey,
        resolveVaultKey: async () => vaultEncryptionKey,
      };

      await confirmVaultRecovery(services.auth, oobCode, newAuthSecret);
      const user = await signInWithAuthSecret(
        services.auth,
        email,
        newAuthSecret,
      );
      await updateUserProfileDocument(services.firestore, user.uid, {
        kdfSalt: bytesToHex(newSalt),
        kdfParams: DEFAULT_KDF_PARAMS,
        protectedVaultKey,
        protectedVaultKeyByRecovery,
      });
      // Recovering from the unlock screen re-signs-in the *same* uid, and
      // Firebase doesn't re-fire onAuthStateChanged for that — so the
      // listener never consumes pendingUnlock. Finish the unlock here rather
      // than leave key material parked in the ref. (Reducer no-ops if the
      // state isn't AUTHENTICATED_LOCKED.)
      if (pendingUnlock.current) {
        pendingUnlock.current = null;
        dispatch({ type: "UNLOCK_REQUESTED" });
        dispatch({
          type: "UNLOCK_SUCCEEDED",
          stretchedMasterKey,
          vaultEncryptionKey,
        });
      }
      // Biometric copies on this device wrap the same VEK, so they remain
      // valid; nothing else to rotate.
      return { recoveryKey };
    },

    async signOut() {
      // Shared-device safety: signing out removes the device-local vault-key
      // copy. Failure is non-fatal because the enrollment marker is removed
      // in clearAllBiometric's finally block and the value remains Keystore-
      // encrypted behind device authentication.
      await clearAllBiometric().catch(() => undefined);
      await clearCopiedSecret();
      setSettings(undefined);
      await signOutKryvex(getServices().auth);
    },
  };

  return (
    <VaultContext.Provider value={value}>
      <VaultSettingsContext.Provider value={settings}>
        {children}
      </VaultSettingsContext.Provider>
    </VaultContext.Provider>
  );
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
