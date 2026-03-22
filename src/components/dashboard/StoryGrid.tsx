"use client";

import type { HNStory } from "@/lib/types";
import { StoryCard } from "./StoryCard";
import { StoryCardSkeleton } from "./StoryCardSkeleton";

interface StoryGridProps {
  stories: HNStory[] | null;
  isLoading: boolean;
}

export function StoryGrid({ stories, isLoading }: StoryGridProps) {
  // Show skeletons while loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <StoryCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Show empty state if no stories
  if (!stories || stories.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 animate-slide-up">
        <div className="text-center">
          <p className="text-slate-400 text-sm">No stories found</p>
          <p className="text-slate-500 text-xs mt-1">Try adjusting your filters or search</p>
        </div>
      </div>
    );
  }

  // Show stories
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up">
      {stories.map((story, index) => (
        <StoryCard key={story.objectID} story={story} index={index} />
      ))}
    </div>
  );
}
