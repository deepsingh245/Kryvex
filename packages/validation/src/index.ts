/**
 * Phase 1 scaffold only. Real boundary schemas (Firestore documents,
 * decrypted item payloads, sync envelopes — see docs/DATA_MODEL.md,
 * build spec §35 "never trust data received from Firebase") land as those
 * boundaries are built, starting Phase 2. This one trivial schema proves
 * the package builds, lints, typechecks, and is importable via
 * `workspace:*`.
 */

import { z } from "zod";

export const nonEmptyStringSchema = z.string().min(1);
