"use client";

import { cn, formatRelativeTime, getDomain } from "@/lib/utils";
import type { HNStory } from "@/lib/types";
import { ExternalLinkIcon, TrendingUpIcon, MessageCircleIcon } from "lucide-react";
import { Card, CardHeader, CardFooter, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface StoryCardProps {
  story: HNStory;
  index?: number;
}

function getStoryBadgeClass(tags: string[]): string {
  if (tags.includes("ask_hn")) return "border-blue-500/30 bg-blue-500/15 text-blue-300";
  if (tags.includes("show_hn")) return "border-emerald-500/30 bg-emerald-500/15 text-emerald-300";
  if (tags.includes("job")) return "border-slate-500/30 bg-slate-500/15 text-slate-300";
  return "border-amber-500/30 bg-amber-500/15 text-amber-300";
}

function getStoryTypeLabel(tags: string[]): string {
  if (tags.includes("ask_hn")) return "Ask HN";
  if (tags.includes("show_hn")) return "Show HN";
  if (tags.includes("job")) return "Job";
  return "Story";
}

function getStoryAccentClass(tags: string[]): string {
  if (tags.includes("ask_hn")) return "border-l-blue-500/60";
  if (tags.includes("show_hn")) return "border-l-emerald-500/60";
  if (tags.includes("job")) return "border-l-slate-500/40";
  return "border-l-hn/50";
}

export function StoryCard({ story, index = 0 }: StoryCardProps) {
  const domain = getDomain(story.url);
  const hnUrl = `https://news.ycombinator.com/item?id=${story.objectID}`;
  const badgeClass = getStoryBadgeClass(story._tags);
  const typeLabel = getStoryTypeLabel(story._tags);

  return (
    <a
      href={hnUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
      className="group block h-full animate-slide-up"
    >
      <Card
        className={cn(
          "h-full overflow-hidden border-l-2 border-white/10 bg-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07] hover:shadow-[0_12px_48px_rgba(0,0,0,0.55)]",
          getStoryAccentClass(story._tags)
        )}
      >
        {/* Header with badge and title */}
        <CardHeader className="space-y-0 p-4 pb-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <Badge
              variant="outline"
              className={cn("rounded-full px-2 py-0.5", badgeClass)}
            >
              {typeLabel}
            </Badge>
            {story.url && (
              <span className="truncate font-mono text-xs text-slate-500">{domain}</span>
            )}
          </div>

          <CardTitle className="line-clamp-3 text-sm font-semibold leading-snug text-slate-100 transition-colors group-hover:text-hn">
            {story.title}
          </CardTitle>
        </CardHeader>

        <Separator className="bg-white/[0.06]" />

        {/* Collapsed Footer */}
        <CardFooter className="flex items-center gap-3 px-4 py-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <TrendingUpIcon className="h-3.5 w-3.5 text-hn" />
            <span className="font-medium tabular-nums">{story.points ?? 0}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <MessageCircleIcon className="h-3.5 w-3.5 text-slate-500" />
            <span className="font-medium tabular-nums">{story.num_comments ?? 0}</span>
          </div>

          <div className="flex-1" />

          <span className="truncate text-xs text-slate-500">{story.author}</span>
          <span className="text-xs text-slate-600">{formatRelativeTime(story.created_at)}</span>
          <ExternalLinkIcon className="h-3 w-3 flex-shrink-0 text-slate-500 transition-colors group-hover:text-hn" />
        </CardFooter>
      </Card>
    </a>
  );
}
