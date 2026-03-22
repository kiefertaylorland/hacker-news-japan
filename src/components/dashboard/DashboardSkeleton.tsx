"use client";

import { StoryCardSkeleton } from "./StoryCardSkeleton";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen w-full py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <div className="h-10 w-48 rounded bg-white/10 animate-pulse" />
          <div className="h-4 w-64 rounded bg-white/10 animate-pulse" />
        </div>

        {/* Search skeleton */}
        <div className="h-10 w-full rounded-lg bg-white/10 animate-pulse" />

        {/* Filters skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-full rounded bg-white/10 animate-pulse" />
          <div className="h-8 w-1/3 rounded bg-white/10 animate-pulse" />
        </div>

        {/* Sort controls skeleton */}
        <div className="h-8 w-full rounded bg-white/10 animate-pulse" />

        {/* Results header skeleton */}
        <div className="h-5 w-40 rounded bg-white/10 animate-pulse" />

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <StoryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
