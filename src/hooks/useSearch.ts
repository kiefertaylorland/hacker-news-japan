"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchStories } from "@/lib/search/api";
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

function readSearchParams(searchParams: URLSearchParams): SearchParams {
  return {
    query: searchParams.get("query") || DEFAULT_SEARCH_PARAMS.query,
    storyType: (searchParams.get("storyType") as StoryType) || DEFAULT_SEARCH_PARAMS.storyType,
    dateRange: (searchParams.get("dateRange") as DateRange) || DEFAULT_SEARCH_PARAMS.dateRange,
    sortBy: (searchParams.get("sortBy") as SortBy) || DEFAULT_SEARCH_PARAMS.sortBy,
    page: parseInt(searchParams.get("page") || "0", 10),
  };
}

function toSearchUrl(params: SearchParams): string {
  const query = new URLSearchParams({
    query: params.query,
    storyType: params.storyType,
    dateRange: params.dateRange,
    sortBy: params.sortBy,
    page: params.page.toString(),
  });
  return `/?${query.toString()}`;
}

export function useSearch(): UseSearchReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [params, setParams] = useState<SearchParams>(() => readSearchParams(searchParams));
  const { query, storyType, dateRange, sortBy, page } = params;

  // Debounced query for API calls
  const debouncedQuery = useDebounce(query, 300);

  // Results state
  const [results, setResults] = useState<AlgoliaResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch results when debounced query or filters change
  useEffect(() => {
    // Wait for the new query rather than fetching the old query on page reset.
    if (query !== debouncedQuery) {
      setIsLoading(true);
      setError(null);
      setResults(null);
      return;
    }

    const controller = new AbortController();
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await searchStories(
          { query: debouncedQuery, storyType, dateRange, sortBy, page },
          controller.signal
        );
        if (controller.signal.aborted) return;
        setResults(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setResults(null);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    // Fetch results with current parameters (empty query is valid—returns top stories)
    fetchResults();
    return () => controller.abort();
  }, [query, debouncedQuery, storyType, dateRange, sortBy, page]);

  // Any filter change resets to the first page; only an explicit page change keeps one.
  const applyChange = useCallback(
    (patch: Partial<SearchParams>) => {
      const next = { ...params, page: 0, ...patch };
      setParams(next);
      router.push(toSearchUrl(next), { scroll: true });
    },
    [params, router]
  );

  const setQuery = useCallback((query: string) => applyChange({ query }), [applyChange]);
  const setStoryType = useCallback((storyType: StoryType) => applyChange({ storyType }), [applyChange]);
  const setDateRange = useCallback((dateRange: DateRange) => applyChange({ dateRange }), [applyChange]);
  const setSortBy = useCallback((sortBy: SortBy) => applyChange({ sortBy }), [applyChange]);
  const setPage = useCallback((page: number) => applyChange({ page }), [applyChange]);

  return { ...params, results, isLoading, error, setQuery, setStoryType, setDateRange, setSortBy, setPage };
}
