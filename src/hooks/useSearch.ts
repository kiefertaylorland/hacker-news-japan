"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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

/**
 * Search state for the dashboard. The server seeds the first render; every
 * later change fetches Algolia directly from the browser and mirrors the params
 * into the URL with the History API (which Next syncs to `useSearchParams`), so
 * interactions never trigger a server round-trip.
 */
export function useSearch(
  initialResults: AlgoliaResponse | null = null,
  initialParams?: SearchParams
): UseSearchReturn {
  const searchParams = useSearchParams();

  const [params, setParams] = useState<SearchParams>(() => readSearchParams(searchParams));
  const { query, storyType, dateRange, sortBy, page } = params;
  // Params the server used to produce `initialResults`; matching them skips the client fetch.
  const initialParamsRef = useRef(initialParams ?? params);
  // True while the typed query has not been written to the URL yet.
  const queryDirtyRef = useRef(false);

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
    // Previous results stay on screen while the user is still typing.
    if (query !== debouncedQuery) {
      setIsLoading(true);
      setError(null);
      return;
    }

    const current = { query: debouncedQuery, storyType, dateRange, sortBy, page };
    if (queryDirtyRef.current) {
      queryDirtyRef.current = false;
      window.history.replaceState(null, "", toSearchUrl(current));
    }

    // Only the params the server actually rendered may reuse the seeded results; any
    // client-side change must fetch (the server never re-renders on pushState).
    const serverParams = initialParams ?? initialParamsRef.current;
    if (initialResults && sameSearchParams(current, serverParams)) {
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
  }, [query, debouncedQuery, storyType, dateRange, sortBy, page, initialResults, initialParams]);

  // Discrete changes (filters, page) get a history entry; typing is mirrored once it settles.
  const navigate = useCallback((next: SearchParams) => {
    queryDirtyRef.current = false;
    setParams(next);
    window.history.pushState(null, "", toSearchUrl(next));
  }, []);

  const setQuery = useCallback((query: string) => {
    queryDirtyRef.current = true;
    setParams((current) => ({ ...current, query, page: 0 }));
  }, []);

  // Any filter change resets to the first page.
  const applyFilterChange = useCallback(
    (patch: Partial<Omit<SearchParams, "query" | "page">>) => navigate({ ...params, ...patch, page: 0 }),
    [navigate, params]
  );

  const setStoryType = useCallback((storyType: StoryType) => applyFilterChange({ storyType }), [applyFilterChange]);
  const setDateRange = useCallback((dateRange: DateRange) => applyFilterChange({ dateRange }), [applyFilterChange]);
  const setSortBy = useCallback((sortBy: SortBy) => applyFilterChange({ sortBy }), [applyFilterChange]);
  const setPage = useCallback(
    (page: number) => {
      navigate({ ...params, page });
      window.scrollTo({ top: 0 });
    },
    [navigate, params]
  );

  return { ...params, results, isLoading, error, setQuery, setStoryType, setDateRange, setSortBy, setPage };
}
