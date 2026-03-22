"use client";

import type { AlgoliaResponse } from "@/lib/types";

interface ResultsHeaderProps {
  query: string;
  results: AlgoliaResponse | null;
  isLoading: boolean;
}

export function ResultsHeader({ query, results, isLoading }: ResultsHeaderProps) {
  if (isLoading) {
    return (
      <div className="h-6 w-48 rounded bg-white/10 animate-pulse" />
    );
  }

  if (!results) {
    return null;
  }

  const count = results.nbHits;

  return (
    <div className="flex items-center justify-between gap-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-1 h-5 rounded-full bg-hn/70 shrink-0" />
        <p className="text-sm text-slate-400">
          <span className="font-bold text-slate-100 tabular-nums">{count.toLocaleString()}</span>
          <span className="mx-1.5 text-slate-600">{count !== 1 ? "stories" : "story"}</span>
          {query ? (
            <>
              <span className="text-slate-600">matching</span>
              <span className="ml-1.5 font-medium text-slate-200 bg-white/[0.06] rounded px-1.5 py-0.5 text-xs">{query}</span>
            </>
          ) : (
            <span className="text-slate-600">about Japan</span>
          )}
        </p>
      </div>
      <div className="flex-1 h-px bg-white/[0.06]" />
    </div>
  );
}
