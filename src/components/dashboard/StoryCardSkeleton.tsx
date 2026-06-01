"use client";

import { Card, CardHeader, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export function StoryCardSkeleton() {
  return (
    <Card className="h-full overflow-hidden border-l-2 border-white/10 border-l-white/10 bg-white/5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
      <CardHeader className="space-y-0 p-4 pb-3">
        {/* Badge and domain */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Title lines */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </CardHeader>

      <Separator className="bg-white/[0.06]" />

      {/* Footer */}
      <CardFooter className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-10" />
        <div className="flex-1" />
        <Skeleton className="h-3 w-20" />
      </CardFooter>
    </Card>
  );
}
