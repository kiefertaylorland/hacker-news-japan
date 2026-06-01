"use client";

import type { AlgoliaResponse } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

interface ResultsHeaderProps {
  query: string;
  results: AlgoliaResponse | null;
  isLoading: boolean;
}

export function ResultsHeader({ query, results, isLoading }: ResultsHeaderProps) {
  if (isLoading) {
    return <Skeleton className="h-6 w-48" />;
  }

  if (!results) {
    return null;
  }

  const count = results.nbHits;

  return (
    <div className="flex animate-fade-in items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-5 w-1 shrink-0 rounded-full bg-hn/70" />
        <p className="text-sm text-slate-400">
          <span className="font-bold tabular-nums text-slate-100">
            {count.toLocaleString()}
          </span>
          <span className="mx-1.5 text-slate-600">{count !== 1 ? "stories" : "story"}</span>
          {query ? (
            <>
              <span className="text-slate-600">matching</span>
              <span className="ml-1.5 rounded bg-white/[0.06] px-1.5 py-0.5 text-xs font-medium text-slate-200">
                {query}
              </span>
            </>
          ) : (
            <span className="text-slate-600">about Japan</span>
          )}
        </p>
      </div>
      <div className="h-px flex-1 bg-white/[0.06]" />
    </div>
  );
}
