"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchStories } from "@/lib/api";
import type {
  AlgoliaResponse,
  DateRange,
  SearchParams,
  SortBy,
  StoryType,
} from "@/lib/types";
import { DEFAULT_SEARCH_PARAMS } from "@/lib/constants";
import { useDebounce } from "./useDebounce";

interface UseSearchReturn extends SearchParams {
  results: AlgoliaResponse | null;
  isLoading: boolean;
  error: string | null;
  setQuery: (query: string) => void;
  setStoryType: (type: StoryType) => void;
  setDateRange: (range: DateRange) => void;
  setSortBy: (sort: SortBy) => void;
  setPage: (page: number) => void;
}

export function useSearch(): UseSearchReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse URL parameters
  const initialQuery = searchParams.get("query") || DEFAULT_SEARCH_PARAMS.query;
  const initialStoryType =
    (searchParams.get("storyType") as StoryType) || DEFAULT_SEARCH_PARAMS.storyType;
  const initialDateRange =
    (searchParams.get("dateRange") as DateRange) || DEFAULT_SEARCH_PARAMS.dateRange;
  const initialSortBy =
    (searchParams.get("sortBy") as SortBy) || DEFAULT_SEARCH_PARAMS.sortBy;
  const initialPage = parseInt(searchParams.get("page") || "0", 10);

  // Local state
  const [query, setQueryLocal] = useState(initialQuery);
  const [storyType, setStoryType] = useState<StoryType>(initialStoryType);
  const [dateRange, setDateRange] = useState<DateRange>(initialDateRange);
  const [sortBy, setSortBy] = useState<SortBy>(initialSortBy);
  const [page, setPageLocal] = useState(initialPage);

  // Debounced query for API calls
  const debouncedQuery = useDebounce(query, 300);

  // Results state
  const [results, setResults] = useState<AlgoliaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update URL when any parameter changes
  const updateUrl = useCallback(
    (q: string, st: StoryType, dr: DateRange, sb: SortBy, p: number) => {
      const params = new URLSearchParams({
        query: q,
        storyType: st,
        dateRange: dr,
        sortBy: sb,
        page: p.toString(),
      });

      // Build URL and remove trailing &
      const url = `/?${params.toString()}`;
      router.push(url, { scroll: false });
    },
    [router]
  );

  // Fetch results when debounced query or filters change
  useEffect(() => {
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await searchStories({
          query: debouncedQuery,
          storyType,
          dateRange,
          sortBy,
          page,
        });
        setResults(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setResults(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch results with current parameters (empty query is valid—returns top stories)
    fetchResults();
  }, [debouncedQuery, storyType, dateRange, sortBy, page]);

  // Setters that also update URL
  const setQuery = useCallback((newQuery: string) => {
    setQueryLocal(newQuery);
    // Reset page when query changes
    setPageLocal(0);
    updateUrl(newQuery, storyType, dateRange, sortBy, 0);
  }, [storyType, dateRange, sortBy, updateUrl]);

  const handleSetStoryType = useCallback((newType: StoryType) => {
    setStoryType(newType);
    setPageLocal(0);
    updateUrl(query, newType, dateRange, sortBy, 0);
  }, [query, dateRange, sortBy, updateUrl]);

  const handleSetDateRange = useCallback((newRange: DateRange) => {
    setDateRange(newRange);
    setPageLocal(0);
    updateUrl(query, storyType, newRange, sortBy, 0);
  }, [query, storyType, sortBy, updateUrl]);

  const handleSetSortBy = useCallback((newSort: SortBy) => {
    setSortBy(newSort);
    setPageLocal(0);
    updateUrl(query, storyType, dateRange, newSort, 0);
  }, [query, storyType, dateRange, updateUrl]);

  const setPage = useCallback((newPage: number) => {
    setPageLocal(newPage);
    updateUrl(query, storyType, dateRange, sortBy, newPage);
  }, [query, storyType, dateRange, sortBy, updateUrl]);

  return {
    query,
    storyType,
    dateRange,
    sortBy,
    page,
    results,
    isLoading,
    error,
    setQuery,
    setStoryType: handleSetStoryType,
    setDateRange: handleSetDateRange,
    setSortBy: handleSetSortBy,
    setPage,
  };
}
