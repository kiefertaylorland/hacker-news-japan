"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";

function validateStoryId(id: string) {
  if (!/^[1-9]\d*$/.test(id)) throw new Error("Invalid story id");
}

export async function loadVote(storyId: string): Promise<{ count: number; voted: boolean }> {
  validateStoryId(storyId);
  const [client, user] = await Promise.all([createClient(), getCurrentUser()]);
  const { count, error } = await client.from("votes").select("story_id", { count: "exact", head: true }).eq("story_id", storyId);
  if (error) throw new Error("Could not load votes");
  if (!user) return { count: count ?? 0, voted: false };
  const selection = await client.from("votes").select("user_id").eq("story_id", storyId).eq("user_id", user.id).maybeSingle();
  if (selection.error) throw new Error("Could not load votes");
  return { count: count ?? 0, voted: selection.data !== null };
}

export async function upvote(storyId: string): Promise<{ error?: string }> {
  validateStoryId(storyId);
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to upvote." };
  const client = await createClient();
  const { error } = await client.from("votes").upsert({ story_id: storyId, user_id: user.id }, {
    onConflict: "user_id,story_id", ignoreDuplicates: true,
  });
  if (error) return { error: "Could not upvote. Please try again." };
  return {};
}
