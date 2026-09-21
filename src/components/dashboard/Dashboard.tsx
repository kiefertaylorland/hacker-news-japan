"use client";

import { useOptimistic, useTransition } from "react";
import { useSearch } from "@/hooks/useSearch";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import { UserMenu } from "@/components/auth/UserMenu";
import type { AuthUser } from "@/lib/auth/user";
import type { HNStory } from "@/lib/types";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterBar } from "@/components/search/FilterBar";
import { SortControls } from "@/components/search/SortControls";
import { ResultsHeader } from "@/components/search/ResultsHeader";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { Pagination } from "@/components/search/Pagination";

interface DashboardProps {
  user?: AuthUser | null;
  savedIds?: string[];
  authError?: boolean;
}

const EMPTY_IDS: string[] = [];

export function Dashboard({ user = null, savedIds = EMPTY_IDS, authError = false }: DashboardProps) {
  const {
    query,
    storyType,
    dateRange,
    sortBy,
    page,
    results,
    isLoading,
    error,
    setQuery,
    setStoryType,
    setDateRange,
    setSortBy,
    setPage,
  } = useSearch();

  const [, startTransition] = useTransition();
  const [optimisticSavedIds, toggleSavedId] = useOptimistic(
    savedIds,
    (current: string[], objectID: string) =>
      current.includes(objectID) ? current.filter((id) => id !== objectID) : [...current, objectID]
  );

  const handleToggleSave = (story: HNStory) => {
    const isSaved = optimisticSavedIds.includes(story.objectID);
    startTransition(async () => {
      toggleSavedId(story.objectID);
      await toggleBookmark(story, isSaved);
    });
  };

  return (
    <main className="min-h-screen w-full py-6 px-4 sm:py-8 sm:px-6 lg:px-8">
      {/* Container */}
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-hn/60" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-hn/80">Hacker News</span>
            </div>
            <div className="flex items-baseline gap-4">
              <h1 className="text-5xl font-bold tracking-tight text-slate-100">日本</h1>
              <span className="text-2xl font-light text-slate-400 tracking-wide">Japan</span>
            </div>
            <p className="text-slate-500 text-sm max-w-md">
              Browse, search, and filter Hacker News stories about Japan — updated in real time.
            </p>
          </div>
          <UserMenu user={user} />
        </div>

        {/* Search */}
        <SearchBar value={query} onChange={setQuery} />

        {/* Filters */}
        <FilterBar
          storyType={storyType}
          dateRange={dateRange}
          onStoryTypeChange={setStoryType}
          onDateRangeChange={setDateRange}
        />

        {/* Sort Controls */}
        <SortControls sortBy={sortBy} onChange={setSortBy} />

        {/* Auth error (from a failed sign-in redirect) */}
        {authError && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-red-300 backdrop-blur-md">
            Sign-in with GitHub didn&apos;t complete. Please try again.
          </div>
        )}

        {/* Error State */}
        {error && (
          <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-red-300 backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Results Header */}
        <div role="status" aria-live="polite" aria-atomic="true">
          {isLoading && <span className="sr-only">Loading stories</span>}
          <ResultsHeader query={query} results={results} isLoading={isLoading} />
        </div>

        {/* Stories Grid */}
        <StoryGrid
          stories={results?.hits || null}
          isLoading={isLoading}
          savedIds={optimisticSavedIds}
          onToggleSave={user ? handleToggleSave : undefined}
        />

        {/* Pagination */}
        <Pagination
          results={results}
          currentPage={page}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      </div>
    </main>
  );
}
