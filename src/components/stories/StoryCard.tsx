"use client";

import Link from "next/link";
import { memo } from "react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { getDomain, getStoryUrl, hnItemUrl } from "@/lib/url";
import type { HNStory } from "@/lib/types";
import {
  BookmarkCheckIcon,
  BookmarkIcon,
  MessageCircleIcon,
  LoaderCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoteButton } from "@/components/votes/VoteButton";

interface StoryCardProps {
  story: HNStory;
  isSaved?: boolean;
  isPending?: boolean;
  saveError?: string;
  onRetrySave?: (id: string) => void;
  onToggleSave?: (story: HNStory) => void;
}

const STORY_PRESENTATION = {
  ask_hn: {
    label: "Ask HN",
    badge: "border-blue-500/30 bg-blue-500/15 text-blue-300",
  },
  show_hn: {
    label: "Show HN",
    badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  job: {
    label: "Job",
    badge: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  },
  story: {
    label: "Story",
    badge: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
};

function getStoryPresentation(tags: string[]) {
  if (tags.includes("ask_hn")) return STORY_PRESENTATION.ask_hn;
  if (tags.includes("show_hn")) return STORY_PRESENTATION.show_hn;
  if (tags.includes("job")) return STORY_PRESENTATION.job;
  return STORY_PRESENTATION.story;
}

// Memoized so a loading flip on the grid does not repaint 30 cards.
export const StoryCard = memo(function StoryCard({ story, isSaved = false, isPending = false, saveError, onRetrySave, onToggleSave }: StoryCardProps) {
  const domain = getDomain(story.url);
  const storyUrl = getStoryUrl(story.url, hnItemUrl(story.objectID));
  const presentation = getStoryPresentation(story._tags);

  return (
    <article className="group story-motion story-row min-w-0 rounded-sm" aria-label={story.title}>
      <div className="flex items-start gap-3 sm:gap-5">
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="wrap-break-word text-base font-semibold leading-7 text-foreground sm:text-lg">
            <a href={storyUrl} target="_blank" rel="noopener noreferrer" className="rounded-sm underline-offset-4 hover:text-orange-300 hover:underline">
              {story.title}
            </a>
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <Badge variant="outline" className={cn("shrink-0 rounded-full px-2 py-0.5", presentation.badge)}>{presentation.label}</Badge>
            {story.url && <span className="max-w-full truncate font-mono">{domain}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <VoteButton storyId={story.objectID} points={story.points} />
            <Link href={`/stories/${story.objectID}`} aria-label={`${story.num_comments ?? 0} comments`} className="inline-flex min-h-11 items-center gap-1.5 rounded-sm hover:text-hn">
              <MessageCircleIcon aria-hidden="true" className="size-3.5" />
              <span className="tabular-nums">{story.num_comments ?? 0}</span><span aria-hidden="true">comments</span>
            </Link>
            <span className="max-w-full truncate">{story.author}</span>
            <time dateTime={story.created_at} suppressHydrationWarning>{formatRelativeTime(story.created_at)}</time>
          </div>
        </div>
        {onToggleSave && (
          <Button id={`bookmark-${story.objectID}`} type="button" variant="ghost" size="icon"
            aria-label={isSaved ? "Remove bookmark" : "Save story"} aria-pressed={isSaved}
            aria-busy={isPending} disabled={isPending} aria-describedby={saveError ? `bookmark-error-${story.objectID}` : undefined}
            onClick={() => onToggleSave(story)}
            className={cn("bookmark-motion size-11 shrink-0 hover:bg-accent", isSaved ? "text-hn hover:text-hn" : "text-muted-foreground hover:text-foreground")}>
            {isPending ? <LoaderCircleIcon aria-hidden="true" className="animate-spin" /> : isSaved ? <BookmarkCheckIcon /> : <BookmarkIcon />}
          </Button>
        )}
      </div>
      {saveError && <div id={`bookmark-error-${story.objectID}`} role="alert" className="mt-2 flex flex-wrap items-center gap-2 text-sm text-red-300">
        <span>{saveError}</span>
        {onRetrySave && <Button variant="outline" size="sm" disabled={isPending} onClick={() => onRetrySave(story.objectID)}>Retry bookmark</Button>}
      </div>}
    </article>
  );
});
