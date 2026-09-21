"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { UserMenu } from "@/components/auth/UserMenu";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
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
    <PageShell>
      <PageHeader
        eyebrow={
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-hn/80 hover:text-hn"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to search
          </Link>
        }
        title={<h1 className="text-4xl font-bold tracking-tight text-slate-100">Saved stories</h1>}
        description="Stories you bookmarked, newest first."
        actions={<UserMenu user={user} next="/saved" />}
      />

      <StoryGrid
        stories={visibleStories}
        isLoading={false}
        savedIds={visibleStories.map((story) => story.objectID)}
        onToggleSave={handleToggleSave}
        emptyTitle="No saved stories yet"
        emptyDescription="Use the bookmark button on a story to save it here."
      />
    </PageShell>
  );
}
