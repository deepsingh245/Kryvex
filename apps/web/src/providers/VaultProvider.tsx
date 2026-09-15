"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  initializeKryvexFirebase,
  observeAuthState,
  resolveKdfParamsForEmail,
  resolveRecoveryEnvelopeForEmail,
  signInWithAuthSecret,
  signOutKryvex,
  signUpWithAuthSecret,
  updateUserProfileDocument,
  verifyRecoveryCode,
  type KryvexFirebaseServices,
} from "@kryvex/firebase";
import { autoLock } from "@kryvex/security";
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
  webFirebaseAppCheckOptions,
  webFirebaseConfig,
  webFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";

const DEFAULT_SETTINGS: UserProfileSettings = {
  autoLockMinutes: 5,
  clipboardClearSeconds: 30,
  biometricUnlockEnabled: false,
};

const MINUTES_TO_MS = 60_000;

// Lazily initialized, client-only. Next.js still renders this "use client"
// component once on the server for the initial HTML — calling
// initializeKryvexFirebase() from the render body would run it there too,
// before window/IndexedDB exist. Every call site below is inside an effect
// or an async method invoked from a user action (both client-only).
function getServices(): KryvexFirebaseServices {
  return initializeKryvexFirebase(
    webFirebaseConfig,
    webFirebaseEmulatorEnv,
    webFirebaseAppCheckOptions,
  );
}

interface KdfParamsRecord {
  kdfSalt: string;
  kdfParams: KdfParams;
  protectedVaultKey?: EncryptedEnvelope;
  settings?: unknown;
}

// Never trust the settings sub-object structurally — same precedent every
// other Firestore read in this file already follows for kdfParams/
// protectedVaultKey. A malformed/missing settings object just means the
// caller's hardcoded DEFAULT_SETTINGS fallback stays in effect; it never
// blocks sign-in/unlock.
function parseSettings(raw: unknown): UserProfileSettings | undefined {
  const parsed = userProfileSettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : undefined;
}

interface RecoveryEnvelopeRecord {
  protectedVaultKeyByRecovery?: EncryptedEnvelope;
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
  lock: (reason?: LockReason) => void;
  recoverVault: (
    oobCode: string,
    recoveryKeyInput: string,
    newMasterPassword: string,
  ) => Promise<{ recoveryKey: string }>;
  updateSettings: (patch: Partial<UserProfileSettings>) => Promise<void>;
  signOut: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(lockStateReducer, initialLockState);
  // Kept as local React state here, not part of the shared @kryvex/vault
  // LockState — same reasoning as `lock()`: avoids touching the reducer
  // apps/mobile also depends on.
  const [settings, setSettings] = useState<UserProfileSettings | undefined>(
    undefined,
  );

  // Set synchronously (before the sign-up/sign-in await) so it's already
  // populated by the time onAuthStateChanged's listener fires below,
  // regardless of exact timing between Firebase's internal auth-state
  // update and our own awaited call resolving. Lets a fresh sign-up/sign-in
  // skip straight to UNLOCKED using the key already in hand, instead of
  // making the user type their master password a second time.
  // resolveVaultKey unifies signUp (already has the VEK, nothing to fetch)
  // and signIn (must fetch+unwrap protectedVaultKey, which requires the
  // authenticated uid the listener callback receives) behind one shape.
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

  function lock(reason?: LockReason) {
    // Key-buffer wiping on lock lives in packages/vault's lockStateReducer
    // itself (LOCK_REQUESTED), not here — it always has the true current
    // state as its own argument, so it can't go stale the way a value
    // captured in this component closure could.
    dispatch(
      reason ? { type: "LOCK_REQUESTED", reason } : { type: "LOCK_REQUESTED" },
    );
    dispatch({ type: "LOCK_COMPLETED" });
  }

  // Auto-lock: active only while unlocked. Resets on any activity signal;
  // locks immediately on tab-hidden (build spec §19's "background" case),
  // or after AUTO_LOCK_TIMEOUT_MS of no activity.
  useEffect(() => {
    if (state.status !== "UNLOCKED") return;

    const timeoutMs =
      (settings?.autoLockMinutes ?? DEFAULT_SETTINGS.autoLockMinutes) *
      MINUTES_TO_MS;
    const timer = autoLock.createInactivityTimer(timeoutMs, () => {
      lock("timeout");
    });

    function handleActivity() {
      timer.reset();
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") lock("background");
    }

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      timer.cancel();
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [state.status, settings?.autoLockMinutes]);

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
      // Recovery Key — see docs/RECOVERY.md §2. A second, independent
      // wrapping of the same VEK; never transmitted or stored unwrapped,
      // shown to the user exactly once by the caller (sign-up page).
      const recoveryKeyBytes = generateKey();
      const protectedVaultKeyByRecovery = encryptBytes(
        recoveryKeyBytes,
        vaultEncryptionKey,
      );
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
      // onAuthStateChanged (registered above) picks this up and auto-unlocks.
      return { recoveryKey: formatRecoveryKey(recoveryKeyBytes) };
    },

    async signIn(email, masterPassword) {
      const services = getServices();
      const params = (await resolveKdfParamsForEmail(
        services.functions,
        email,
      )) as KdfParamsRecord | null;
      if (!params) {
        // Same generic message as a wrong password — never reveal which.
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
        // a tag mismatch throws and is caught below. No need to
        // re-authenticate against Firebase on every unlock; the user is
        // already signed in (AUTHENTICATED_LOCKED implies that).
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

    lock,

    async recoverVault(oobCode, recoveryKeyInput, newMasterPassword) {
      const services = getServices();
      // Firebase's oobCode is what actually proves control of the email
      // inbox — see docs/RECOVERY.md §3. verifyRecoveryCode throws if the
      // link is expired/already used/invalid.
      const email = await verifyRecoveryCode(services.auth, oobCode);

      const envelope = (await resolveRecoveryEnvelopeForEmail(
        services.functions,
        email,
      )) as RecoveryEnvelopeRecord | null;
      if (!envelope?.protectedVaultKeyByRecovery) {
        throw new Error("Recovery isn't available for this account.");
      }

      // Second, independent proof: possession of the Recovery Key itself.
      // A tag mismatch (wrong key) throws the same generic message
      // decryptBytes already uses — fail-closed, same precedent as unlock.
      const recoveryKeyBytes = parseRecoveryKey(recoveryKeyInput);
      const vaultEncryptionKey = decryptBytes(
        recoveryKeyBytes,
        envelope.protectedVaultKeyByRecovery,
      );

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

      // The used kit is spent — issue a fresh Recovery Key, per
      // docs/RECOVERY.md §3 step 5.
      const newRecoveryKeyBytes = generateKey();
      const protectedVaultKeyByRecovery = encryptBytes(
        newRecoveryKeyBytes,
        vaultEncryptionKey,
      );

      // Same pendingUnlock mechanism signUp/signIn already use — the VEK
      // is already in hand, so the observeAuthState listener registered
      // above auto-unlocks once signInWithAuthSecret below fires it,
      // without asking the user to type the new password a second time.
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

      return { recoveryKey: formatRecoveryKey(newRecoveryKeyBytes) };
    },

    async updateSettings(patch) {
      if (state.status !== "UNLOCKED") {
        throw new Error("Vault is locked.");
      }
      const services = getServices();
      const next: UserProfileSettings = {
        ...(settings ?? DEFAULT_SETTINGS),
        ...patch,
      };
      await updateUserProfileDocument(services.firestore, state.user.uid, {
        settings: next,
      });
      setSettings(next);
    },

    async signOut() {
      await signOutKryvex(getServices().auth);
    },
  };

  return (
    <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
  );
}

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
