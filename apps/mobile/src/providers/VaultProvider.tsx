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
  deriveAuthAndStretchedKey,
  deriveKdfMaterial,
  generateKdfSalt,
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
  const pendingUnlockKey = useRef<Uint8Array | null>(null);

  useEffect(() => {
    const services = getServices();
    return observeAuthState(services.auth, (user) => {
      if (!user) {
        dispatch({ type: "FIREBASE_SIGNED_OUT" });
        return;
      }
      dispatch({ type: "FIREBASE_SIGNED_IN", user });
      const key = pendingUnlockKey.current;
      if (key) {
        pendingUnlockKey.current = null;
        dispatch({ type: "UNLOCK_REQUESTED" });
        dispatch({ type: "UNLOCK_SUCCEEDED", stretchedMasterKey: key });
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
      pendingUnlockKey.current = stretchedMasterKey;

      const user = await signUpWithAuthSecret(services.auth, email, authSecret);
      await createUserProfileDocument(services.firestore, user.uid, {
        email,
        kdfSalt: bytesToHex(salt),
        kdfParams: DEFAULT_KDF_PARAMS,
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
      pendingUnlockKey.current = stretchedMasterKey;
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
        if (!profile) throw new Error("Profile not found.");
        const { masterKey } = await deriveKdfMaterial(
          masterPassword,
          hexToBytes(profile.kdfSalt),
          profile.kdfParams,
        );
        const { authSecret, stretchedMasterKey } =
          deriveAuthAndStretchedKey(masterKey);
        await signInWithAuthSecret(services.auth, user.email, authSecret);
        dispatch({ type: "UNLOCK_SUCCEEDED", stretchedMasterKey });
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
