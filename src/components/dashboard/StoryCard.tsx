"use client";

import { formatRelativeTime, getDomain } from "@/lib/utils";
import type { HNStory } from "@/lib/types";
import { ExternalLinkIcon, TrendingUpIcon, MessageCircleIcon } from "lucide-react";

interface StoryCardProps {
  story: HNStory;
  index?: number;
}

function getStoryBadgeClass(tags: string[]): string {
  if (tags.includes("ask_hn")) return "badge-ask";
  if (tags.includes("show_hn")) return "badge-show";
  if (tags.includes("job")) return "badge-job";
  return "badge-story";
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
      className={`glass group block h-full overflow-hidden animate-slide-up border-l-2 ${getStoryAccentClass(story._tags)}`}
    >
      {/* Header with badge and title */}
      <div className="p-4 pb-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className={badgeClass}>{typeLabel}</span>
          {story.url && (
            <span className="text-xs text-slate-500 truncate font-mono">{domain}</span>
          )}
        </div>

        <h3 className="text-sm font-semibold leading-snug text-slate-100 line-clamp-3 group-hover:text-hn transition-colors">
          {story.title}
        </h3>
      </div>

      {/* Single Divider */}
      <div className="border-t border-white/[0.06]" />

      {/* Collapsed Footer */}
      <div className="px-4 py-3 flex items-center gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <TrendingUpIcon className="w-3.5 h-3.5 text-hn" />
          <span className="font-medium tabular-nums">{story.points ?? 0}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <MessageCircleIcon className="w-3.5 h-3.5 text-slate-500" />
          <span className="font-medium tabular-nums">{story.num_comments ?? 0}</span>
        </div>

        <div className="flex-1" />

        <span className="text-slate-500 text-xs truncate">{story.author}</span>
        <span className="text-slate-600 text-xs">{formatRelativeTime(story.created_at)}</span>
        <ExternalLinkIcon className="w-3 h-3 text-slate-500 group-hover:text-hn transition-colors flex-shrink-0" />
      </div>
    </a>
  );
}
