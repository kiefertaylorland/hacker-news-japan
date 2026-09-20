"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { toBookmarkRow } from "@/lib/bookmarks";
import { createClient } from "@/lib/supabase/server";
import type { HNStory } from "@/lib/types";

export async function toggleBookmark(story: HNStory, isSaved: boolean) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/?auth_error=1");
  }

  const supabase = await createClient();
  const table = supabase.from("bookmarks");
  const { error } = isSaved
    ? await table.delete().eq("user_id", user.id).eq("object_id", story.objectID)
    : await table.insert(toBookmarkRow(story, user.id));

  if (error) {
    throw new Error(`Could not update bookmark: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/saved");
}
