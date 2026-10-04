import type { AuthUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

export interface LocalComment {
  id: string;
  author: string;
  body: string;
  created_at: string;
}

export async function listComments(storyId: string): Promise<LocalComment[]> {
  const client = await createClient();
  const { data, error } = await client.from("comments").select("id, author, body, created_at")
    .eq("story_id", storyId).order("created_at", { ascending: true });
  if (error) throw new Error(`Could not load comments: ${error.message}`);
  return (data ?? []) as LocalComment[];
}

export async function addComment(storyId: string, user: AuthUser, body: string): Promise<void> {
  const client = await createClient();
  const { error } = await client.from("comments").insert({ story_id: storyId, user_id: user.id, author: user.name, body });
  if (error) throw new Error(`Could not post comment: ${error.message}`);
}
