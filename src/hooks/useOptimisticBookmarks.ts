"use client";

import { useCallback, useOptimistic, useRef, useTransition } from "react";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import type { HNStory } from "@/lib/types";

/**
 * Optimistic saved-id set backed by the toggleBookmark server action.
 * The id set flips immediately on click and snaps back to the server-provided
 * `savedIds` once the action settles and the page revalidates.
 */
export function useOptimisticBookmarks(savedIds: string[]) {
  const [, startTransition] = useTransition();
  const pendingSavedByStory = useRef<Record<string, boolean>>({});
  const [optimisticIds, toggleId] = useOptimistic(
    savedIds,
    (current: string[], objectID: string) =>
      current.includes(objectID) ? current.filter((id) => id !== objectID) : [...current, objectID]
  );

  // Stable identity so memoized story cards do not rerender on unrelated state changes.
  const toggle = useCallback(
    (story: HNStory) => {
      const isSaved = pendingSavedByStory.current[story.objectID] ?? optimisticIds.includes(story.objectID);
      pendingSavedByStory.current[story.objectID] = !isSaved;
      startTransition(async () => {
        toggleId(story.objectID);
        try {
          await toggleBookmark(story, isSaved);
        } finally {
          if (pendingSavedByStory.current[story.objectID] === !isSaved) {
            delete pendingSavedByStory.current[story.objectID];
          }
        }
      });
    },
    [optimisticIds, startTransition, toggleId]
  );

  return { savedIds: optimisticIds, toggle };
}
