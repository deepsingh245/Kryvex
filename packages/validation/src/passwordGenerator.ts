/**
 * Password Generator options validation — used by both the standalone
 * Generator screen and the panel embedded in the Login item form (see
 * @kryvex/ui's PasswordGeneratorPanel) before calling
 * @kryvex/password-generator's generatePassword.
 */

import { z } from "zod";

export const passwordGeneratorOptionsSchema = z
  .object({
    length: z.number().int().min(8).max(128),
    includeLowercase: z.boolean(),
    includeUppercase: z.boolean(),
    includeDigits: z.boolean(),
    includeSymbols: z.boolean(),
    excludeAmbiguous: z.boolean(),
  })
  .refine(
    (o) =>
      o.includeLowercase ||
      o.includeUppercase ||
      o.includeDigits ||
      o.includeSymbols,
    { message: "At least one character set must be enabled." },
  );

export type PasswordGeneratorOptionsInput = z.infer<
  typeof passwordGeneratorOptionsSchema
>;
