/**
 * The explicit lock state machine — see docs/ARCHITECTURE.md §2. Pure
 * TypeScript, no React dependency (same precedent as @kryvex/ui staying
 * framework-agnostic until concretely needed): apps/web and apps/mobile
 * each own a thin Context provider that wires @kryvex/firebase (I/O) to
 * this reducer (business logic), keeping "only @kryvex/firebase touches
 * the network" (docs/ARCHITECTURE.md §6) intact — this package never
 * imports @kryvex/firebase.
 */

import type { AuthenticatedUser } from "@kryvex/types";

export type LockState =
  | { status: "SIGNED_OUT" }
  | { status: "AUTHENTICATED_LOCKED"; user: AuthenticatedUser }
  | { status: "UNLOCKING"; user: AuthenticatedUser }
  // stretchedMasterKey: kept for future re-wrapping operations (key
  // rotation, master password change), not just the initial unwrap.
  // vaultEncryptionKey: the unwrapped VEK, added Phase 3. Phase 4 adds
  // decrypted item cache handles. Extend only when the corresponding phase
  // actually produces the value — don't add fields speculatively.
  | {
      status: "UNLOCKED";
      user: AuthenticatedUser;
      stretchedMasterKey: Uint8Array;
      vaultEncryptionKey: Uint8Array;
    }
  | { status: "LOCKING"; user: AuthenticatedUser };

export type LockAction =
  | { type: "FIREBASE_SIGNED_IN"; user: AuthenticatedUser }
  | { type: "FIREBASE_SIGNED_OUT" }
  | { type: "UNLOCK_REQUESTED" }
  | {
      type: "UNLOCK_SUCCEEDED";
      stretchedMasterKey: Uint8Array;
      vaultEncryptionKey: Uint8Array;
    }
  | { type: "UNLOCK_FAILED" }
  | { type: "LOCK_REQUESTED"; reason?: "manual" | "timeout" | "background" }
  | { type: "LOCK_COMPLETED" };

export const initialLockState: LockState = { status: "SIGNED_OUT" };

/**
 * Invalid transitions return the state unchanged rather than throwing —
 * keeps the reducer pure and trivially testable. Logging/telemetry for an
 * unexpected action in a given state belongs in the calling layer, not here.
 */
export function lockStateReducer(
  state: LockState,
  action: LockAction,
): LockState {
  switch (action.type) {
    case "FIREBASE_SIGNED_IN":
      // onAuthStateChanged can refire with the same user — idempotent.
      return state.status === "SIGNED_OUT"
        ? { status: "AUTHENTICATED_LOCKED", user: action.user }
        : state;

    case "FIREBASE_SIGNED_OUT":
      // Valid from any state and always wins — discards key material
      // implicitly by discarding the whole state object.
      return { status: "SIGNED_OUT" };

    case "UNLOCK_REQUESTED":
      return state.status === "AUTHENTICATED_LOCKED"
        ? { status: "UNLOCKING", user: state.user }
        : state;

    case "UNLOCK_SUCCEEDED":
      return state.status === "UNLOCKING"
        ? {
            status: "UNLOCKED",
            user: state.user,
            stretchedMasterKey: action.stretchedMasterKey,
            vaultEncryptionKey: action.vaultEncryptionKey,
          }
        : state;

    case "UNLOCK_FAILED":
      return state.status === "UNLOCKING"
        ? { status: "AUTHENTICATED_LOCKED", user: state.user }
        : state;

    case "LOCK_REQUESTED":
      return state.status === "UNLOCKED"
        ? { status: "LOCKING", user: state.user }
        : state;

    case "LOCK_COMPLETED":
      return state.status === "LOCKING"
        ? { status: "AUTHENTICATED_LOCKED", user: state.user }
        : state;

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

export function isUnlocked(
  state: LockState,
): state is Extract<LockState, { status: "UNLOCKED" }> {
  return state.status === "UNLOCKED";
}

export function isAuthenticated(state: LockState): boolean {
  return state.status !== "SIGNED_OUT";
}
