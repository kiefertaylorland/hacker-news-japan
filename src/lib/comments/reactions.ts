import { createClient } from "@/lib/supabase/server";

export interface CommentReactions {
  upvoted: string[];
  favorited: string[];
}

/** The signed-in user's upvotes and favorites among the given local comments. */
export async function listCommentReactions(userId: string | null, commentIds: string[]): Promise<CommentReactions> {
  if (!userId || commentIds.length === 0) return { upvoted: [], favorited: [] };
  const client = await createClient();
  const [upvoted, favorited] = await Promise.all(["comment_votes", "comment_favorites"].map(async (table) => {
    const { data, error } = await client.from(table).select("comment_id").eq("user_id", userId).in("comment_id", commentIds);
    if (error) throw new Error(`Could not load comment reactions: ${error.message}`);
    return ((data ?? []) as { comment_id: string }[]).map((row) => row.comment_id);
  }));
  return { upvoted, favorited };
}
