import { z } from "zod";

const urlSchema = z
  .string()
  .url()
  .max(4096)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "https:" || protocol === "http:";
  });
const idSchema = z.string().min(1).max(256);

export const extensionRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("GET_STATUS") }),
  z.object({
    type: z.literal("SIGN_IN"),
    email: z.string().email().max(320),
    masterPassword: z.string().min(1).max(4096),
  }),
  z.object({
    type: z.literal("UNLOCK"),
    masterPassword: z.string().min(1).max(4096),
  }),
  z.object({ type: z.literal("LOCK") }),
  z.object({ type: z.literal("SIGN_OUT") }),
  z.object({ type: z.literal("SYNC_NOW") }),
  z.object({ type: z.literal("OPEN_POPUP") }),
  z.object({ type: z.literal("LIST_MATCHES"), url: urlSchema }),
  z.object({
    type: z.literal("GET_CREDENTIAL"),
    url: urlSchema,
    itemId: idSchema,
    grant: idSchema,
  }),
  z.object({
    type: z.literal("CAPTURE_CREDENTIAL"),
    url: urlSchema,
    username: z.string().max(1024),
    password: z.string().min(1).max(4096),
    kind: z.enum(["signin", "signup", "password-change"]),
  }),
  z.object({ type: z.literal("GET_PENDING_PROMPT"), url: urlSchema }),
  z.object({
    type: z.literal("COMMIT_DRAFT"),
    url: urlSchema,
    draftId: idSchema,
    action: z.enum(["save", "update", "save-new"]),
    targetItemId: idSchema.optional(),
  }),
  z.object({
    type: z.literal("DISMISS_DRAFT"),
    url: urlSchema,
    draftId: idSchema,
  }),
  z.object({ type: z.literal("LIST_CONFLICTS") }),
  z.object({
    type: z.literal("OPEN_CONFLICTS"),
    conflictId: idSchema.optional(),
  }),
  z.object({
    type: z.literal("PULL_CONFLICT"),
    conflictId: idSchema.optional(),
  }),
  z.object({
    type: z.literal("CONFLICT_RESOLVED"),
    conflictId: idSchema,
  }),
]);

export type ExtensionRequest = z.infer<typeof extensionRequestSchema>;

export interface MatchSummary {
  itemId: string;
  title: string;
  username: string;
}

export interface PendingPrompt {
  draftId: string;
  mode: "save" | "update" | "choose";
  hostname: string;
  username: string;
  candidates: MatchSummary[];
  expiresAt: number;
}

export interface ExtensionStatus {
  state: "SIGNED_OUT" | "LOCKED" | "UNLOCKED";
  email?: string;
  expiresAt?: number;
  conflictCount: number;
}

export type ExtensionResponse<T = unknown> =
  { ok: true; data: T } | { ok: false; error: string };

export async function sendExtensionRequest<T>(
  request: ExtensionRequest,
): Promise<ExtensionResponse<T>> {
  return (await chrome.runtime.sendMessage(request)) as ExtensionResponse<T>;
}
