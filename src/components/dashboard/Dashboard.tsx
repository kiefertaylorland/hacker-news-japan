"use client";

import { useSearch } from "@/hooks/useSearch";
import { useOptimisticBookmarks } from "@/hooks/useOptimisticBookmarks";
import { UserMenu } from "@/components/auth/UserMenu";
import { ErrorAlert } from "@/components/layout/ErrorAlert";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import type { AuthUser } from "@/lib/auth/user";
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

  const bookmarks = useOptimisticBookmarks(savedIds);

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-hn/60" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-hn/80">Hacker News</span>
          </div>
        }
        title={
          <div className="flex items-baseline gap-4">
            <h1 className="text-5xl font-bold tracking-tight text-slate-100">日本</h1>
            <span className="text-2xl font-light text-slate-400 tracking-wide">Japan</span>
          </div>
        }
        description="Browse, search, and filter Hacker News stories about Japan — updated in real time."
        actions={<UserMenu user={user} />}
      />

      <SearchBar value={query} onChange={setQuery} />

      <FilterBar
        storyType={storyType}
        dateRange={dateRange}
        onStoryTypeChange={setStoryType}
        onDateRangeChange={setDateRange}
      />

      <SortControls sortBy={sortBy} onChange={setSortBy} />

      {/* Auth error (from a failed sign-in redirect) */}
      {authError && <ErrorAlert>Sign-in with GitHub didn&apos;t complete. Please try again.</ErrorAlert>}

      {error && <ErrorAlert>{error}</ErrorAlert>}

      <div role="status" aria-live="polite" aria-atomic="true">
        {isLoading && <span className="sr-only">Loading stories</span>}
        <ResultsHeader query={query} results={results} isLoading={isLoading} />
      </div>

      <StoryGrid
        stories={results?.hits || null}
        isLoading={isLoading}
        savedIds={bookmarks.savedIds}
        onToggleSave={user ? bookmarks.toggle : undefined}
      />

      <Pagination
        results={results}
        currentPage={page}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </PageShell>
  );
}
