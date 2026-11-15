import { Skeleton } from "@/components/ui/skeleton";

export function StoryCardSkeleton() {
  return (
    <div aria-hidden="true" className="story-row rounded-xl space-y-3">
      <Skeleton className="h-7 w-4/5" />
      <Skeleton className="h-4 w-40" />
      <div className="flex h-11 items-center gap-4"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>
    </div>
  );
}
