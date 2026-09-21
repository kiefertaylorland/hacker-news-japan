"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AUTH_ERROR_PATH } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/user";
import { setBookmark } from "@/lib/bookmarks/queries";
import type { HNStory } from "@/lib/types";

export async function toggleBookmark(story: HNStory, isSaved: boolean) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(AUTH_ERROR_PATH);
  }

  await setBookmark(story, user.id, isSaved);

  revalidatePath("/");
  revalidatePath("/saved");
}
