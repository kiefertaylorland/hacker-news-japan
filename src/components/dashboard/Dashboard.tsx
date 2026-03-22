"use client";

import { useSearch } from "@/hooks/useSearch";
import { SearchBar } from "./SearchBar";
import { FilterBar } from "./FilterBar";
import { SortControls } from "./SortControls";
import { ResultsHeader } from "./ResultsHeader";
import { StoryGrid } from "./StoryGrid";
import { Pagination } from "./Pagination";

export function Dashboard() {
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

  return (
    <div className="min-h-screen w-full py-8 px-4 sm:px-6 lg:px-8">
      {/* Container */}
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
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

        {/* Error State */}
        {error && (
          <div className="glass border-red-500/50 border bg-red-500/10 p-4 rounded-lg text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Results Header */}
        <ResultsHeader query={query} results={results} isLoading={isLoading} />

        {/* Stories Grid */}
        <StoryGrid stories={results?.hits || null} isLoading={isLoading} />

        {/* Pagination */}
        <Pagination
          results={results}
          currentPage={page}
          onPageChange={setPage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
