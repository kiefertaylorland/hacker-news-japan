import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export function StoryCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden border-l-2 border-white/10 border-l-white/10 bg-card/90 shadow-[0_10px_30px_rgba(0,0,0,0.14)]">
      <CardHeader className="space-y-0 p-5 pb-4">
        {/* Badge and domain */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Title lines */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-4/6" />
        </div>
      </CardHeader>

      <Separator className="bg-white/6" />

      {/* Footer */}
      <CardFooter className="flex items-center gap-3 px-5 py-3.5">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-10" />
        <div className="flex-1" />
        <Skeleton className="h-3 w-20" />
      </CardFooter>
    </Card>
  );
}
