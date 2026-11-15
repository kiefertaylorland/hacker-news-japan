"use client";

import Link from "next/link";
import { BookmarkStatus } from "@/components/stories/BookmarkStatus";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon } from "lucide-react";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { UserMenu } from "@/components/auth/UserMenu";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { ErrorAlert } from "@/components/layout/ErrorAlert";
import { useOptimisticBookmarks } from "@/hooks/useOptimisticBookmarks";
import type { AuthUser } from "@/lib/auth/user";
import type { HNStory } from "@/lib/types";

interface SavedStoriesProps {
  user: AuthUser;
  stories: HNStory[];
  recommendations: HNStory[] | null;
}

export function SavedStories({ user, stories, recommendations }: SavedStoriesProps) {
  const bookmarks = useOptimisticBookmarks(stories.map((story) => story.objectID));
  const visibleStories = stories.filter((story) => bookmarks.savedIds.includes(story.objectID));

  const toggle = (story: HNStory) => {
    document.getElementById("saved-heading")?.focus();
    bookmarks.toggle(story);
  };
  const retry = (id: string) => {
    document.getElementById("saved-heading")?.focus();
    bookmarks.retryFailed(id);
  };
  const recommendationStories = recommendations?.filter((story) => !bookmarks.savedIds.includes(story.objectID)) ?? [];

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-hn hover:text-hn"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back to search
          </Link>
        }
        title={<h1 id="saved-heading" tabIndex={-1} className="text-4xl font-bold tracking-tight text-slate-100">Saved stories</h1>}
        description="Stories you bookmarked, newest first."
        actions={<UserMenu user={user} next="/saved" />}
      />

      <BookmarkStatus message={bookmarks.message} errors={bookmarks.errors} visibleIds={[...visibleStories, ...recommendationStories].map((story) => story.objectID)} onRetry={bookmarks.retryFailed} />
      <StoryGrid
        stories={visibleStories}
        isLoading={false}
        savedIds={bookmarks.savedIds}
        pendingIds={bookmarks.pendingIds}
        saveErrors={bookmarks.errors}
        onRetrySave={retry}
        onToggleSave={toggle}
        emptyAction={<Button asChild variant="outline"><Link href="/">Browse stories</Link></Button>}
        emptyTitle="No saved stories yet"
        emptyDescription="Use the bookmark button on a story to save it here."
      />

      <section aria-labelledby="recommendations-heading" className="space-y-4">
        <div className="space-y-2">
          <h2 id="recommendations-heading" className="text-2xl font-bold tracking-tight text-slate-100">
            Recommended for you
          </h2>
          <p className="text-sm text-muted-foreground">Japan stories related to topics in your saved posts.</p>
        </div>
        {recommendations === null ? (
          <ErrorAlert><p>Could not load recommendations.</p><a href="/saved" className="inline-flex min-h-11 items-center underline underline-offset-4">Retry recommendations</a></ErrorAlert>
        ) : (
          <StoryGrid
            stories={recommendationStories}
            isLoading={false}
            savedIds={bookmarks.savedIds}
            pendingIds={bookmarks.pendingIds}
            saveErrors={bookmarks.errors}
            onRetrySave={retry}
            onToggleSave={toggle}
            emptyTitle={stories.length === 0 ? "Save stories to get recommendations" : "No recommendations yet"}
            emptyDescription="Save more stories about topics you enjoy to discover related posts."
          />
        )}
      </section>
    </PageShell>
  );
}
