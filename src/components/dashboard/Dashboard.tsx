"use client";

import { Suspense, use } from "react";
import { useSearch } from "@/hooks/useSearch";
import { useOptimisticBookmarks } from "@/hooks/useOptimisticBookmarks";
import { UserMenu } from "@/components/auth/UserMenu";
import { ErrorAlert } from "@/components/layout/ErrorAlert";
import { DashboardHeader } from "./DashboardHeader";
import { PageShell } from "@/components/layout/PageShell";
import type { AuthUser } from "@/lib/auth/user";
import type { AlgoliaResponse, HNStory, SearchParams } from "@/lib/types";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterBar } from "@/components/search/FilterBar";
import { SortControls } from "@/components/search/SortControls";
import { ResultsHeader } from "@/components/search/ResultsHeader";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { Pagination } from "@/components/search/Pagination";
import { ActiveFilters } from "@/components/search/ActiveFilters";
import { BookmarkStatus } from "@/components/stories/BookmarkStatus";
import { Button } from "@/components/ui/button";

interface DashboardProps {
  user?: AuthUser | null;
  /** Saved story ids, or a pending promise so the grid can render before they arrive. */
  savedIds?: string[] | Promise<string[]>;
  authError?: boolean;
  initialResults?: AlgoliaResponse | null;
  initialParams?: SearchParams;
}

const EMPTY_IDS: string[] = [];

interface BookmarkableGridProps {
  user: AuthUser | null;
  savedIds: string[] | Promise<string[]>;
  stories: HNStory[] | null;
  isLoading: boolean;
}

function BookmarkableGrid({ user, savedIds, stories, isLoading }: BookmarkableGridProps) {
  const bookmarks = useOptimisticBookmarks(Array.isArray(savedIds) ? savedIds : use(savedIds));
  return (
    <>
    <BookmarkStatus message={bookmarks.message} errors={bookmarks.errors} visibleIds={stories?.map((story) => story.objectID) ?? []} onRetry={bookmarks.retryFailed} />
    <StoryGrid
      stories={stories}
      isLoading={isLoading}
      savedIds={bookmarks.savedIds}
      pendingIds={bookmarks.pendingIds}
      saveErrors={bookmarks.errors}
      onRetrySave={bookmarks.retryFailed}
      onToggleSave={user ? bookmarks.toggle : undefined}
    />
    </>
  );
}

export function Dashboard({
  user = null,
  savedIds = EMPTY_IDS,
  authError = false,
  initialResults = null,
  initialParams,
}: DashboardProps) {
  const search = useSearch(initialResults, initialParams);
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
    retry,
    reset,
  } = search;

  const stories = results?.hits || null;

  return (
    <PageShell activePage="/">
      <DashboardHeader actions={<UserMenu user={user} />} />

      <section aria-label="Search controls" className="editorial-panel space-y-4 p-3 sm:p-4">
        <SearchBar value={query} onChange={setQuery} />

        <div className="flex flex-col gap-4 border-t border-white/8 pt-4">
          <FilterBar
            storyType={storyType}
            dateRange={dateRange}
            onStoryTypeChange={setStoryType}
            onDateRangeChange={setDateRange}
          />

          <SortControls sortBy={sortBy} onChange={setSortBy} />
        </div>
        <ActiveFilters {...search} />
      </section>

      {/* Auth error (from a failed sign-in redirect) */}
      {authError && <ErrorAlert>Sign-in with GitHub didn&apos;t complete. Please try again.</ErrorAlert>}

      {error && <ErrorAlert><p>{error}</p><p>Could not refresh stories. {results && "Previous results are still shown below."}</p><Button variant="outline" className="mt-3" onClick={retry}>Retry search</Button></ErrorAlert>}

      <div role="status" aria-live="polite" aria-atomic="true" className="min-h-6">
        {isLoading && <span className="sr-only">Loading stories</span>}
        {error ? <span>{results ? "Previous results" : "Stories unavailable"}</span> : <ResultsHeader query={query} results={results} isLoading={isLoading} sortBy={sortBy} />}
      </div>

      {/* Streamed bookmarks: stories render immediately and the save buttons appear once the ids
          resolve. The boundary is skipped when ids are already known so the grid HTML is sent once. */}
      {!error || results ? <>
      {savedIds instanceof Promise ? (
        <Suspense fallback={<><div className="min-h-6" /><StoryGrid stories={stories} isLoading={isLoading} /></>}>
          <BookmarkableGrid user={user} savedIds={savedIds} stories={stories} isLoading={isLoading} />
        </Suspense>
      ) : (
        <BookmarkableGrid user={user} savedIds={savedIds} stories={stories} isLoading={isLoading} />
      )}
      {!isLoading && results?.hits.length === 0 && <Button variant="outline" onClick={reset}>Clear filters and browse stories</Button>}
      </> : null}

      <Pagination
        results={results}
        currentPage={page}
        onPageChange={setPage}
        isLoading={isLoading || !!error}
      />
    </PageShell>
  );
}
