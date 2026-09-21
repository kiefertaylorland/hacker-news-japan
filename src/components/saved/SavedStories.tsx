"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { UserMenu } from "@/components/auth/UserMenu";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import type { AuthUser } from "@/lib/auth/user";
import type { HNStory } from "@/lib/types";

interface SavedStoriesProps {
  user: AuthUser;
  stories: HNStory[];
}

export function SavedStories({ user, stories }: SavedStoriesProps) {
  const [, startTransition] = useTransition();
  const [visibleStories, removeStory] = useOptimistic(stories, (current: HNStory[], objectID: string) =>
    current.filter((story) => story.objectID !== objectID)
  );

  const handleToggleSave = (story: HNStory) => {
    startTransition(async () => {
      removeStory(story.objectID);
      await toggleBookmark(story, true);
    });
  };

  return (
    <main className="min-h-screen w-full py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-hn/80 hover:text-hn"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              Back to search
            </Link>
            <h1 className="text-4xl font-bold tracking-tight text-slate-100">Saved stories</h1>
            <p className="max-w-md text-sm text-slate-500">
              Stories you bookmarked, newest first.
            </p>
          </div>
          <UserMenu user={user} next="/saved" />
        </div>

        <StoryGrid
          stories={visibleStories}
          isLoading={false}
          savedIds={visibleStories.map((story) => story.objectID)}
          onToggleSave={handleToggleSave}
          emptyTitle="No saved stories yet"
          emptyDescription="Use the bookmark button on a story to save it here."
        />
      </div>
    </main>
  );
}
