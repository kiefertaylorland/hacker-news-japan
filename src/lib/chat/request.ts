import { z } from "zod";

// Only text history is accepted. Clients cannot inject system prompts or tool results.
export const chatRequestSchema = z
  .object({
    storyId: z
      .string()
      .regex(/^[1-9]\d{0,19}$/)
      .optional(),
    messages: z
      .array(
        z
          .object({
            id: z.string().min(1).max(100),
            role: z.enum(["user", "assistant"]),
            parts: z
              .array(
                z
                  .object({
                    type: z.literal("text"),
                    text: z.string().trim().min(1).max(32000),
                  })
                  .strict(),
              )
              .min(1)
              .max(1),
          })
          .strict()
          // Generated answers can be longer than the 8,000-character composer limit.
          .refine((message) =>
            message.role === "assistant" ||
            message.parts.every((part) => part.text.length <= 8000)),
      )
      .min(1)
      .max(40),
  })
  .strict()
  .refine((value) => value.messages.at(-1)?.role === "user");

export function isChatConfigured(): boolean {
  return Boolean(
    process.env.AI_CHAT_MODEL &&
    (process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN),
  );
}
