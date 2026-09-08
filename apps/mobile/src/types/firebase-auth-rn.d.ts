/**
 * `@firebase/auth`'s (and the `firebase` wrapper's) "exports" map hoists its
 * "types" condition outside the node/browser/react-native branches — a
 * single `auth-public.d.ts` is used for typing regardless of
 * `customConditions`, and that file doesn't declare
 * `getReactNativePersistence` (only `dist/rn/index.rn.d.ts` does, which TS
 * never actually resolves to). Confirmed empirically: an isolated tsc run
 * with `customConditions: ["react-native"]` still reports the export
 * missing, for both "firebase/auth" and "@firebase/auth". Metro resolves
 * the real react-native build correctly at runtime regardless — this is a
 * types-only gap. This augmentation patches only that one gap.
 */
import type { Persistence } from "firebase/auth";

declare module "@firebase/auth" {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
