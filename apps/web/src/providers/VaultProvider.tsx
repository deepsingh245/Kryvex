"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
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
  initializeKryvexFirebase,
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
  webFirebaseConfig,
  webFirebaseEmulatorEnv,
} from "@/lib/firebaseConfig";

// Lazily initialized, client-only. Next.js still renders this "use client"
// component once on the server for the initial HTML — calling
// initializeKryvexFirebase() from the render body would run it there too,
// before window/IndexedDB exist. Every call site below is inside an effect
// or an async method invoked from a user action (both client-only).
function getServices(): KryvexFirebaseServices {
  return initializeKryvexFirebase(webFirebaseConfig, webFirebaseEmulatorEnv);
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

  // Set synchronously (before the sign-up/sign-in await) so it's already
  // populated by the time onAuthStateChanged's listener fires below,
  // regardless of exact timing between Firebase's internal auth-state
  // update and our own awaited call resolving. Lets a fresh sign-up/sign-in
  // skip straight to UNLOCKED using the key already in hand, instead of
  // making the user type their master password a second time.
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
      // onAuthStateChanged (registered above) picks this up and auto-unlocks.
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
        // Phase 2 has no local unwrap-and-fail-closed check yet (that's
        // Phase 3's protectedVaultKey mechanism) — re-verifying against
        // Firebase is the only available correctness signal. The server
        // still only ever sees the derived authSecret, never the master
        // password, so this doesn't weaken zero-knowledge.
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
