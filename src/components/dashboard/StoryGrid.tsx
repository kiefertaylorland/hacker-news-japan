"use client";

import type { HNStory } from "@/lib/types";
import { StoryCard } from "./StoryCard";
import { StoryCardSkeleton } from "./StoryCardSkeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SearchXIcon } from "lucide-react";

interface StoryGridProps {
  stories: HNStory[] | null;
  isLoading: boolean;
}

export function StoryGrid({ stories, isLoading }: StoryGridProps) {
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
      <Empty className="animate-slide-up border border-dashed border-white/10 bg-white/[0.02]">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-white/5 text-slate-400">
            <SearchXIcon />
          </EmptyMedia>
          <EmptyTitle className="text-slate-200">No stories found</EmptyTitle>
          <EmptyDescription className="text-slate-500">
            Try adjusting your filters or search.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent />
      </Empty>
    );
  }

  // Show stories
  return (
    <div className="grid animate-slide-up grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stories.map((story, index) => (
        <StoryCard key={story.objectID} story={story} index={index} />
      ))}
    </div>
  );
}
