"use client";

import { memo } from "react";
import type { HNStory } from "@/lib/types";
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
  // Show skeletons while loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <StoryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show empty state if no stories
  if (!stories || stories.length === 0) {
    return (
      <EmptyState
        className="animate-slide-up"
        icon={<SearchXIcon />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  // Show stories
  return (
    <div className="grid animate-slide-up grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stories.map((story, index) => (
        <StoryCard
          key={story.objectID}
          story={story}
          index={index}
          isSaved={savedIds?.includes(story.objectID) ?? false}
          onToggleSave={onToggleSave}
        />
      ))}
    </div>
  );
});
