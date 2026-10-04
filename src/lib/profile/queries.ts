import { createClient } from "@/lib/supabase/server";
import { fetchFromAlgolia } from "@/lib/search/algolia";
import type { LocalComment } from "@/lib/comments/queries";
import type { HNStory } from "@/lib/types";

/** Like HN, each profile list shows a page of the most recent items. */
const PROFILE_LIST_LIMIT = 30;

export interface ProfileComment extends LocalComment {
  story_id: string;
}

/** Account creation time; `getUser` verifies the session with the auth server. */
export async function getAccountCreatedAt(): Promise<string> {
  const client = await createClient();
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data.user.created_at;
}

export async function listUpvotedStories(userId: string): Promise<HNStory[]> {
  const client = await createClient();
  const { data, error } = await client.from("votes").select("story_id").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(PROFILE_LIST_LIMIT);
  if (error) throw new Error(`Could not load upvoted submissions: ${error.message}`);
  const ids = ((data ?? []) as { story_id: string }[]).map((row) => row.story_id);
  if (ids.length === 0) return [];
  const params = new URLSearchParams({
    tags: `(story,poll,job),(${ids.map((id) => `story_${id}`).join(",")})`,
    hitsPerPage: String(ids.length),
  });
  const { hits } = await fetchFromAlgolia(`https://hn.algolia.com/api/v1/search?${params}`);
  const stories = new Map(hits.map((story) => [story.objectID, story]));
  return ids.flatMap((id) => stories.get(id) ?? []);
}

async function listReactedComments(table: string, label: string, userId: string): Promise<ProfileComment[]> {
  const client = await createClient();
  const { data, error } = await client.from(table).select("comment:comments(id, story_id, author, body, created_at)")
    .eq("user_id", userId).order("created_at", { ascending: false }).limit(PROFILE_LIST_LIMIT);
  if (error) throw new Error(`Could not load ${label} comments: ${error.message}`);
  return ((data ?? []) as unknown as { comment: ProfileComment }[]).map((row) => row.comment);
}

export const listUpvotedComments = (userId: string) => listReactedComments("comment_votes", "upvoted", userId);
export const listFavoriteComments = (userId: string) => listReactedComments("comment_favorites", "favorite", userId);
