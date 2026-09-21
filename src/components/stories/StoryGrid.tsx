"use client";

import { memo } from "react";
import { HITS_PER_PAGE } from "@/lib/constants";
import type { HNStory } from "@/lib/types";
import { cn } from "@/lib/utils";
import { StoryCard } from "./StoryCard";
import { StoryCardSkeleton } from "./StoryCardSkeleton";
import { EmptyState } from "@/components/layout/EmptyState";
import { SearchXIcon } from "lucide-react";

interface StoryGridProps {
  stories: HNStory[] | null;
  isLoading: boolean;
  savedIds?: string[];
  onToggleSave?: (story: HNStory) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export const StoryGrid = memo(function StoryGrid({
  stories,
  isLoading,
  savedIds,
  onToggleSave,
  emptyTitle = "No stories found",
  emptyDescription = "Try adjusting your filters or search.",
}: StoryGridProps) {
  // Show a full page of skeletons only when there is nothing to keep on screen.
  if (isLoading && !stories?.length) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: HITS_PER_PAGE }).map((_, i) => (
          <StoryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show empty state if no stories
  if (!stories || stories.length === 0) {
    return (
      <EmptyState
        icon={<SearchXIcon />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  // Show stories; previous results stay visible (dimmed) while the next page loads.
  return (
    <div
      aria-busy={isLoading}
      className={cn(
        "grid animate-fade-in grid-cols-1 gap-4 transition-opacity md:grid-cols-2 lg:grid-cols-3",
        isLoading && "opacity-60"
      )}
    >
      {stories.map((story) => (
        <StoryCard
          key={story.objectID}
          story={story}
          isSaved={savedIds?.includes(story.objectID) ?? false}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
});
