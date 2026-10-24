import { PageShell } from "@/components/layout/PageShell";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "./DashboardHeader";

export function DashboardSkeleton() {
  return (
    <PageShell>
      <DashboardHeader actions={<Skeleton className="h-8 w-40" />} />

      {/* Search skeleton */}
      <Skeleton className="h-12 w-full rounded-xl" />

      {/* Filters skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-11 w-full sm:h-9 sm:w-96" />
        <Skeleton className="h-11 w-48 sm:h-8" />
      </div>

      {/* Sort controls skeleton */}
      <Skeleton className="h-11 w-full sm:h-7" />

      {/* Results header skeleton */}
      <Skeleton className="h-6 w-48" />

      {/* Grid skeleton */}
      <StoryGrid stories={null} isLoading />
    </PageShell>
  );
}
