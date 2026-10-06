import { createClient } from "@/lib/supabase/server";

export async function consumeChatQuota(signal: AbortSignal): Promise<boolean> {
  const client = await createClient();
  const { data, error } = await client.rpc("consume_chat_quota").abortSignal(signal);
  if (error || typeof data !== "boolean") throw new Error("Chat quota unavailable.");
  return data;
}
