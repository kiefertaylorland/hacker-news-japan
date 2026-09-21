"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchStories } from "@/lib/search/api";
import type { AlgoliaResponse, DateRange, SearchParams, SortBy, StoryType } from "@/lib/types";
import { readSearchParams, sameSearchParams, toSearchUrl } from "@/lib/search/params";
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

export function useSearch(initialResults: AlgoliaResponse | null = null): UseSearchReturn {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [params, setParams] = useState<SearchParams>(() => readSearchParams(searchParams));
  const { query, storyType, dateRange, sortBy, page } = params;
  // Params the server used to produce `initialResults`; matching them skips the client fetch.
  const initialParamsRef = useRef(params);

  // Debounced query for API calls
  const debouncedQuery = useDebounce(query, 300);

  // Results state
  const [results, setResults] = useState<AlgoliaResponse | null>(initialResults);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const next = readSearchParams(searchParams);
    setParams((current) => (sameSearchParams(current, next) ? current : next));
  }, [searchParams]);

  // Fetch results when debounced query or filters change
  useEffect(() => {
    // Wait for the new query rather than fetching the old query on page reset.
    if (query !== debouncedQuery) {
      setIsLoading(true);
      setError(null);
      setResults(null);
      return;
    }

    const current = { query: debouncedQuery, storyType, dateRange, sortBy, page };
    if (initialResults && sameSearchParams(current, initialParamsRef.current)) {
      setResults(initialResults);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const fetchResults = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await searchStories(current, controller.signal);
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
  }, [query, debouncedQuery, storyType, dateRange, sortBy, page, initialResults]);

  // Any filter change resets to the first page.
  const applyFilterChange = useCallback(
    (patch: Partial<Omit<SearchParams, "page">>) => {
      const next = { ...params, ...patch, page: 0 };
      setParams(next);
      router.push(toSearchUrl(next), { scroll: true });
    },
    [params, router]
  );

  const setQuery = useCallback((query: string) => applyFilterChange({ query }), [applyFilterChange]);
  const setStoryType = useCallback((storyType: StoryType) => applyFilterChange({ storyType }), [applyFilterChange]);
  const setDateRange = useCallback((dateRange: DateRange) => applyFilterChange({ dateRange }), [applyFilterChange]);
  const setSortBy = useCallback((sortBy: SortBy) => applyFilterChange({ sortBy }), [applyFilterChange]);
  const setPage = useCallback(
    (page: number) => {
      const next = { ...params, page };
      setParams(next);
      router.push(toSearchUrl(next), { scroll: true });
    },
    [params, router]
  );

  return { ...params, results, isLoading, error, setQuery, setStoryType, setDateRange, setSortBy, setPage };
}
