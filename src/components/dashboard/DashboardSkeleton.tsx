"use client";

import { StoryCardSkeleton } from "./StoryCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Search skeleton */}
        <Skeleton className="h-12 w-full rounded-xl" />

        {/* Filters skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-1/3" />
        </div>

        {/* Sort controls skeleton */}
        <Skeleton className="h-8 w-full" />

        {/* Results header skeleton */}
        <Skeleton className="h-5 w-40" />

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <StoryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
