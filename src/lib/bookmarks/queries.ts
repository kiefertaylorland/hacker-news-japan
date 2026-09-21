import { createClient } from "@/lib/supabase/server";
import type { HNStory } from "@/lib/types";

export interface BookmarkRow {
  user_id: string;
  object_id: string;
  title: string;
  url: string | null;
  author: string;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
  tags: string[];
}

const TABLE = "bookmarks";

export function toBookmarkRow(story: HNStory, userId: string): BookmarkRow {
  return {
    user_id: userId,
    object_id: story.objectID,
    title: story.title,
    url: story.url,
    author: story.author,
    points: story.points,
    num_comments: story.num_comments,
    created_at_i: story.created_at_i,
    tags: story._tags,
  };
}

export function toHNStory(row: BookmarkRow): HNStory {
  return {
    objectID: row.object_id,
    title: row.title,
    url: row.url,
    author: row.author,
    points: row.points,
    num_comments: row.num_comments,
    created_at: new Date(row.created_at_i * 1000).toISOString(),
    created_at_i: row.created_at_i,
    _tags: row.tags,
    story_id: Number(row.object_id),
  };
}

function assertOk(error: { message: string } | null, action: "load" | "update"): void {
  if (error) throw new Error(`Could not ${action} bookmark${action === "load" ? "s" : ""}: ${error.message}`);
}

export async function getBookmarkIds(userId: string | null): Promise<string[]> {
  if (!userId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.from(TABLE).select("object_id").eq("user_id", userId);
  assertOk(error, "load");
  return (data ?? []).map((row: { object_id: string }) => row.object_id);
}

export async function listBookmarks(userId: string): Promise<HNStory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("user_id, object_id, title, url, author, points, num_comments, created_at_i, tags")
    .eq("user_id", userId)
    .order("saved_at", { ascending: false });
  assertOk(error, "load");
  return ((data ?? []) as BookmarkRow[]).map(toHNStory);
}

/** Inserts the bookmark, or removes it when `isSaved` is true. Idempotent in both directions. */
export async function setBookmark(story: HNStory, userId: string, isSaved: boolean): Promise<void> {
  const supabase = await createClient();
  const table = supabase.from(TABLE);
  const { error } = isSaved
    ? await table.delete().eq("user_id", userId).eq("object_id", story.objectID)
    : await table.upsert(toBookmarkRow(story, userId), {
        onConflict: "user_id,object_id",
        ignoreDuplicates: true,
      });
  assertOk(error, "update");
}
