"use client";

import { PageShell } from "@/components/layout/PageShell";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <PageShell>
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
      <StoryGrid stories={null} isLoading />
    </PageShell>
  );
}
