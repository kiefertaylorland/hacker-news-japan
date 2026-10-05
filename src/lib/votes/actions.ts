"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";

function validateStoryId(id: string) {
  if (!/^[1-9]\d*$/.test(id)) throw new Error("Invalid story id");
}

const MAX_STORY_IDS = 100;

export type VoteState = { count: number; voted: boolean };

export async function loadVotes(storyIds: string[]): Promise<Record<string, VoteState>> {
  if (storyIds.length === 0 || storyIds.length > MAX_STORY_IDS) throw new Error("Invalid story ids");
  storyIds.forEach(validateStoryId);
  const [client, user] = await Promise.all([createClient(), getCurrentUser()]);
  const [counts, selection] = await Promise.all([
    client.rpc("story_vote_counts", { requested_story_ids: storyIds }),
    user ? client.from("votes").select("story_id").in("story_id", storyIds).eq("user_id", user.id) : { data: [], error: null },
  ]);
  if (counts.error || selection.error) throw new Error("Could not load votes");
  const voted = new Set((selection.data as { story_id: string }[]).map((row) => row.story_id));
  const countById = new Map((counts.data as { story_id: string; count: number }[]).map((row) => [row.story_id, row.count]));
  return Object.fromEntries(storyIds.map((id) => [id, { count: countById.get(id) ?? 0, voted: voted.has(id) }]));
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
