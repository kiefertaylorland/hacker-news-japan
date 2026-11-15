"use client";

import { useCallback, useOptimistic, useRef, useState, useTransition } from "react";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import type { HNStory } from "@/lib/types";

/**
 * Optimistic saved-id set backed by the toggleBookmark server action.
 * The id set flips immediately on click and snaps back to the server-provided
 * `savedIds` once the action settles and the page revalidates.
 */
export function useOptimisticBookmarks(savedIds: string[]) {
  const [, startTransition] = useTransition();
  const pendingSavedByStory = useRef(new Set<string>());
  const failedStories = useRef(new Map<string, { story: HNStory; isSaved: boolean }>());
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [optimisticIds, toggleId] = useOptimistic(
    savedIds,
    (current: string[], { id, saved }: { id: string; saved: boolean }) =>
      saved ? [...current.filter((value) => value !== id), id] : current.filter((value) => value !== id)
  );

  const mutate = useCallback(
    (story: HNStory, isSaved: boolean) => {
      const id = story.objectID;
      if (pendingSavedByStory.current.has(id)) return;
      pendingSavedByStory.current.add(id);
      failedStories.current.delete(id);
      setPendingIds([...pendingSavedByStory.current]);
      setErrors((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setMessage(isSaved ? "Removing bookmark…" : "Saving story…");
      startTransition(async () => {
        toggleId({ id, saved: !isSaved });
        try {
          await toggleBookmark(story, isSaved);
          setMessage(isSaved ? "Bookmark removed." : "Story saved.");
        } catch {
          toggleId({ id, saved: isSaved });
          failedStories.current.set(id, { story, isSaved });
          setErrors((current) => ({ ...current, [id]: `Could not update bookmark for "${story.title}". Your previous saved state has been restored.` }));
          setMessage("");
        } finally {
          pendingSavedByStory.current.delete(id);
          setPendingIds([...pendingSavedByStory.current]);
        }
      });
    },
    [startTransition, toggleId]
  );

  const toggle = useCallback((story: HNStory) => {
    mutate(story, optimisticIds.includes(story.objectID));
  }, [mutate, optimisticIds]);

  // A retry repeats the failed intent; a fresh toggle follows the current label.
  const retryFailed = useCallback((id: string) => {
    const failed = failedStories.current.get(id);
    if (failed) mutate(failed.story, failed.isSaved);
  }, [mutate]);

  return { savedIds: optimisticIds, toggle, pendingIds, errors, message, retryFailed };
}
