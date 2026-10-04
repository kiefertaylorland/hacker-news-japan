"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";

function validateCommentId(id: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error("Invalid comment id");
}

export async function upvoteComment(commentId: string): Promise<{ error?: string }> {
  validateCommentId(commentId);
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to upvote." };
  const client = await createClient();
  const { error } = await client.from("comment_votes").upsert({ comment_id: commentId, user_id: user.id }, {
    onConflict: "user_id,comment_id", ignoreDuplicates: true,
  });
  if (error) return { error: "Could not upvote. Please try again." };
  revalidatePath("/profile");
  return {};
}

/** Adds the favorite when `favorite` is true, otherwise removes it. Idempotent in both directions. */
export async function setCommentFavorite(commentId: string, favorite: boolean): Promise<{ error?: string }> {
  validateCommentId(commentId);
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to favorite." };
  const table = (await createClient()).from("comment_favorites");
  const { error } = favorite
    ? await table.upsert({ comment_id: commentId, user_id: user.id }, { onConflict: "user_id,comment_id", ignoreDuplicates: true })
    : await table.delete().eq("user_id", user.id).eq("comment_id", commentId);
  if (error) return { error: "Could not update favorite. Please try again." };
  revalidatePath("/profile");
  return {};
}
