"use client";

import { useOptimistic, useTransition } from "react";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import type { HNStory } from "@/lib/types";

/**
 * Optimistic saved-id set backed by the toggleBookmark server action.
 * The id set flips immediately on click and snaps back to the server-provided
 * `savedIds` once the action settles and the page revalidates.
 */
export function useOptimisticBookmarks(savedIds: string[]) {
  const [, startTransition] = useTransition();
  const [optimisticIds, toggleId] = useOptimistic(
    savedIds,
    (current: string[], objectID: string) =>
      current.includes(objectID) ? current.filter((id) => id !== objectID) : [...current, objectID]
  );

  const toggle = (story: HNStory) => {
    const isSaved = optimisticIds.includes(story.objectID);
    startTransition(async () => {
      toggleId(story.objectID);
      await toggleBookmark(story, isSaved);
    });
  };

  return { savedIds: optimisticIds, toggle };
}
