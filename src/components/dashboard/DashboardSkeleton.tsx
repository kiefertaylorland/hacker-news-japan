import { PageShell } from "@/components/layout/PageShell";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "./DashboardHeader";

export function DashboardSkeleton() {
  return (
    <PageShell activePage="/">
      <DashboardHeader actions={<Skeleton className="h-11 w-40" />} />

      <div className="editorial-panel space-y-4 p-3 sm:p-4">
        <Skeleton className="h-13 w-full rounded-xl" />
        <div className="flex flex-col gap-4 border-t border-white/8 pt-4">
          <Skeleton className="h-11 w-full sm:h-9 sm:w-[34rem]" />
          <Skeleton className="h-11 w-full sm:h-8 sm:w-64" />
        </div>
        <div />
      </div>

      {/* Results header skeleton */}
      <Skeleton className="h-6 w-48" />
      {/* Match the bookmark-status space reserved by the loaded dashboard. */}
      <div className="min-h-6" />

      {/* Grid skeleton */}
      <StoryGrid stories={null} isLoading />
    </PageShell>
  );
}
