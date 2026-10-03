"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/user";
import { validateStoryId } from "@/lib/comments/algolia";
import { addComment } from "@/lib/comments/queries";

export async function postComment(storyId: string, body: string): Promise<{ error?: string }> {
  validateStoryId(storyId);
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to comment." };
  if (typeof body !== "string" || !body.trim() || body.trim().length > 10000) {
    return { error: "Enter a comment between 1 and 10,000 characters." };
  }
  try {
    await addComment(storyId, user, body.trim());
  } catch {
    return { error: "Could not post comment. Please try again." };
  }
  revalidatePath(`/stories/${storyId}`);
  return {};
}
