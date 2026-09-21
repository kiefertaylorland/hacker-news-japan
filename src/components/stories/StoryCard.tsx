"use client";

import { cn, formatRelativeTime } from "@/lib/utils";
import { getDomain, getStoryUrl, hnItemUrl } from "@/lib/url";
import type { HNStory } from "@/lib/types";
import {
  BookmarkCheckIcon,
  BookmarkIcon,
  ExternalLinkIcon,
  TrendingUpIcon,
  MessageCircleIcon,
} from "lucide-react";
import { Card, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface StoryCardProps {
  story: HNStory;
  index?: number;
  isSaved?: boolean;
  onToggleSave?: (story: HNStory) => void;
}

const STORY_PRESENTATION = {
  ask_hn: {
    label: "Ask HN",
    badge: "border-blue-500/30 bg-blue-500/15 text-blue-300",
    accent: "border-l-blue-500/60",
  },
  show_hn: {
    label: "Show HN",
    badge: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
    accent: "border-l-emerald-500/60",
  },
  job: {
    label: "Job",
    badge: "border-slate-500/30 bg-slate-500/15 text-slate-300",
    accent: "border-l-slate-500/40",
  },
  story: {
    label: "Story",
    badge: "border-amber-500/30 bg-amber-500/15 text-amber-300",
    accent: "border-l-hn/50",
  },
};

function getStoryPresentation(tags: string[]) {
  if (tags.includes("ask_hn")) return STORY_PRESENTATION.ask_hn;
  if (tags.includes("show_hn")) return STORY_PRESENTATION.show_hn;
  if (tags.includes("job")) return STORY_PRESENTATION.job;
  return STORY_PRESENTATION.story;
}

export function StoryCard({ story, index = 0, isSaved = false, onToggleSave }: StoryCardProps) {
  const domain = getDomain(story.url);
  const storyUrl = getStoryUrl(story.url, hnItemUrl(story.objectID));
  const presentation = getStoryPresentation(story._tags);

  return (
    <div
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
      className="group block h-full min-w-0 animate-slide-up rounded-xl"
    >
      <Card
        className={cn(
          "h-full overflow-hidden border-l-2 border-white/10 bg-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_12px_48px_rgba(0,0,0,0.55)]",
          presentation.accent
        )}
      >
        {/* Header with badge and title */}
        <CardHeader className="space-y-0 p-4 pb-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <Badge
              variant="outline"
              className={cn("shrink-0 rounded-full px-2 py-0.5", presentation.badge)}
            >
              {presentation.label}
            </Badge>
            <div className="flex min-w-0 items-center gap-2">
              {story.url && (
                <span className="truncate font-mono text-xs text-slate-500">{domain}</span>
              )}
              {onToggleSave && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={isSaved ? "Remove bookmark" : "Save story"}
                  aria-pressed={isSaved}
                  onClick={() => onToggleSave(story)}
                  className={cn(
                    "-mr-2 -mt-1.5 h-7 w-7 shrink-0 hover:bg-white/10",
                    isSaved ? "text-hn hover:text-hn" : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  {isSaved ? <BookmarkCheckIcon /> : <BookmarkIcon />}
                </Button>
              )}
            </div>
          </div>

          <CardTitle className="line-clamp-3 break-words text-sm font-semibold leading-snug text-slate-100 transition-colors group-hover:text-hn">
            <a
              href={storyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hn focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {story.title}
            </a>
          </CardTitle>
        </CardHeader>

        <Separator className="bg-white/[0.06]" />

        {/* Collapsed Footer */}
        <CardFooter className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-xs text-slate-400">
          <div className="flex shrink-0 items-center gap-1.5">
            <TrendingUpIcon className="h-3.5 w-3.5 text-hn" />
            <span className="font-medium tabular-nums">{story.points ?? 0}</span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <MessageCircleIcon className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-medium tabular-nums">{story.num_comments ?? 0}</span>
          </div>

          <div className="flex-1" />

          <span className="min-w-0 max-w-full truncate text-xs text-slate-500">{story.author}</span>
          <span suppressHydrationWarning className="shrink-0 text-xs text-slate-600">
            {formatRelativeTime(story.created_at)}
          </span>
          <ExternalLinkIcon className="h-3 w-3 flex-shrink-0 text-slate-500 transition-colors group-hover:text-hn" />
        </CardFooter>
      </Card>
    </div>
  );
}
