/**
 * User profile settings schema — see docs/DATA_MODEL.md §4 and
 * @kryvex/types/userProfile.ts's UserProfileSettings. Validates the
 * `settings` sub-object read back from Firestore before trusting it
 * structurally, same "never trust data structurally" precedent
 * vaultItemDocumentSchema/attachmentDocumentSchema already follow.
 */

import { z } from "zod";

export const userProfileSettingsSchema = z.object({
  autoLockMinutes: z.number().int().positive(),
  clipboardClearSeconds: z.number().int().positive(),
  biometricUnlockEnabled: z.boolean(),
});

export type UserProfileSettingsInput = z.infer<
  typeof userProfileSettingsSchema
>;
