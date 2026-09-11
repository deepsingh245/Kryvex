import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
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
  type KdfParams,
} from "@kryvex/crypto";
import {
  createUserProfileDocument,
  fetchUserProfileDocument,
  initializeKryvexFirebaseNative,
  observeAuthState,
  resolveKdfParamsForEmail,
  signInWithAuthSecret,
  signOutKryvex,
  signUpWithAuthSecret,
  type KryvexFirebaseServices,
} from "@kryvex/firebase";
import type { EncryptedEnvelope } from "@kryvex/types";
import {
  initialLockState,
  lockStateReducer,
  type LockState,
} from "@kryvex/vault";
import {
  mobileFirebaseConfig,
  mobileFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";

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
}

interface VaultContextValue {
  state: LockState;
  signUp: (email: string, masterPassword: string) => Promise<void>;
  signIn: (email: string, masterPassword: string) => Promise<void>;
  unlock: (masterPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(lockStateReducer, initialLockState);
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

  const value: VaultContextValue = {
    state,

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
      const vaultEncryptionKey = generateKey();
      const protectedVaultKey = encryptBytes(
        stretchedMasterKey,
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
        settings: {
          autoLockMinutes: 5,
          clipboardClearSeconds: 30,
          biometricUnlockEnabled: false,
        },
      });
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
        // Local AEAD unwrap is the authoritative "wrong password" signal —
        // no need to re-authenticate against Firebase on every unlock.
        const vaultEncryptionKey = decryptBytes(
          stretchedMasterKey,
          profile.protectedVaultKey,
        );
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
