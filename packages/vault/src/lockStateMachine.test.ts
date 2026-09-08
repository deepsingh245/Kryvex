import { describe, expect, it } from "vitest";
import {
  initialLockState,
  isAuthenticated,
  isUnlocked,
  lockStateReducer,
  type LockState,
} from "./lockStateMachine";

const user = { uid: "alice", email: "alice@example.com" };
const key = new Uint8Array([1, 2, 3]);

const SIGNED_OUT: LockState = { status: "SIGNED_OUT" };
const AUTHENTICATED_LOCKED: LockState = {
  status: "AUTHENTICATED_LOCKED",
  user,
};
const UNLOCKING: LockState = { status: "UNLOCKING", user };
const UNLOCKED: LockState = {
  status: "UNLOCKED",
  user,
  stretchedMasterKey: key,
};
const LOCKING: LockState = { status: "LOCKING", user };

describe("lockStateReducer — valid transitions", () => {
  it("SIGNED_OUT + FIREBASE_SIGNED_IN -> AUTHENTICATED_LOCKED", () => {
    expect(
      lockStateReducer(SIGNED_OUT, { type: "FIREBASE_SIGNED_IN", user }),
    ).toEqual(AUTHENTICATED_LOCKED);
  });

  it("AUTHENTICATED_LOCKED + UNLOCK_REQUESTED -> UNLOCKING", () => {
    expect(
      lockStateReducer(AUTHENTICATED_LOCKED, { type: "UNLOCK_REQUESTED" }),
    ).toEqual(UNLOCKING);
  });

  it("UNLOCKING + UNLOCK_SUCCEEDED -> UNLOCKED", () => {
    expect(
      lockStateReducer(UNLOCKING, {
        type: "UNLOCK_SUCCEEDED",
        stretchedMasterKey: key,
      }),
    ).toEqual(UNLOCKED);
  });

  it("UNLOCKING + UNLOCK_FAILED -> AUTHENTICATED_LOCKED", () => {
    expect(lockStateReducer(UNLOCKING, { type: "UNLOCK_FAILED" })).toEqual(
      AUTHENTICATED_LOCKED,
    );
  });

  it("UNLOCKED + LOCK_REQUESTED -> LOCKING", () => {
    expect(lockStateReducer(UNLOCKED, { type: "LOCK_REQUESTED" })).toEqual(
      LOCKING,
    );
  });

  it("LOCKING + LOCK_COMPLETED -> AUTHENTICATED_LOCKED", () => {
    expect(lockStateReducer(LOCKING, { type: "LOCK_COMPLETED" })).toEqual(
      AUTHENTICATED_LOCKED,
    );
  });

  it("FIREBASE_SIGNED_OUT wins from every state", () => {
    for (const state of [
      SIGNED_OUT,
      AUTHENTICATED_LOCKED,
      UNLOCKING,
      UNLOCKED,
      LOCKING,
    ]) {
      expect(lockStateReducer(state, { type: "FIREBASE_SIGNED_OUT" })).toEqual(
        SIGNED_OUT,
      );
    }
  });

  it("FIREBASE_SIGNED_IN is idempotent once past SIGNED_OUT", () => {
    for (const state of [AUTHENTICATED_LOCKED, UNLOCKING, UNLOCKED, LOCKING]) {
      expect(
        lockStateReducer(state, { type: "FIREBASE_SIGNED_IN", user }),
      ).toEqual(state);
    }
  });
});

describe("lockStateReducer — invalid transitions return the state unchanged", () => {
  it("UNLOCK_REQUESTED is a no-op outside AUTHENTICATED_LOCKED", () => {
    for (const state of [SIGNED_OUT, UNLOCKING, UNLOCKED, LOCKING]) {
      expect(lockStateReducer(state, { type: "UNLOCK_REQUESTED" })).toEqual(
        state,
      );
    }
  });

  it("UNLOCK_SUCCEEDED is a no-op outside UNLOCKING", () => {
    for (const state of [SIGNED_OUT, AUTHENTICATED_LOCKED, UNLOCKED, LOCKING]) {
      expect(
        lockStateReducer(state, {
          type: "UNLOCK_SUCCEEDED",
          stretchedMasterKey: key,
        }),
      ).toEqual(state);
    }
  });

  it("UNLOCK_FAILED is a no-op outside UNLOCKING", () => {
    for (const state of [SIGNED_OUT, AUTHENTICATED_LOCKED, UNLOCKED, LOCKING]) {
      expect(lockStateReducer(state, { type: "UNLOCK_FAILED" })).toEqual(state);
    }
  });

  it("LOCK_REQUESTED is a no-op outside UNLOCKED", () => {
    for (const state of [
      SIGNED_OUT,
      AUTHENTICATED_LOCKED,
      UNLOCKING,
      LOCKING,
    ]) {
      expect(lockStateReducer(state, { type: "LOCK_REQUESTED" })).toEqual(
        state,
      );
    }
  });

  it("LOCK_COMPLETED is a no-op outside LOCKING", () => {
    for (const state of [
      SIGNED_OUT,
      AUTHENTICATED_LOCKED,
      UNLOCKING,
      UNLOCKED,
    ]) {
      expect(lockStateReducer(state, { type: "LOCK_COMPLETED" })).toEqual(
        state,
      );
    }
  });
});

describe("initialLockState", () => {
  it("starts SIGNED_OUT", () => {
    expect(initialLockState).toEqual(SIGNED_OUT);
  });
});

describe("isUnlocked / isAuthenticated", () => {
  it("isUnlocked is true only for UNLOCKED", () => {
    expect(isUnlocked(UNLOCKED)).toBe(true);
    for (const state of [
      SIGNED_OUT,
      AUTHENTICATED_LOCKED,
      UNLOCKING,
      LOCKING,
    ]) {
      expect(isUnlocked(state)).toBe(false);
    }
  });

  it("isAuthenticated is false only for SIGNED_OUT", () => {
    expect(isAuthenticated(SIGNED_OUT)).toBe(false);
    for (const state of [AUTHENTICATED_LOCKED, UNLOCKING, UNLOCKED, LOCKING]) {
      expect(isAuthenticated(state)).toBe(true);
    }
  });
});
