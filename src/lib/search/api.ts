import { buildAlgoliaURL, CLIENT_SORTS, fetchFromAlgolia, sortHitsByStrategy } from "./algolia";
import { HITS_PER_PAGE } from "../constants";
import type { AlgoliaResponse, SearchParams } from "../types";

/** Identifies the sorted window a set of params reads from: every field but `page`. */
export function searchWindowKey({ query, storyType, dateRange, sortBy }: SearchParams): string {
  return JSON.stringify([sortBy, storyType, dateRange, query]);
}

/**
 * Fetches and sorts the whole CLIENT_SORT_WINDOW for a client-sorted search. The
 * result is page-agnostic; callers slice pages out of it with pageSearchWindow.
 */
export async function fetchSearchWindow(
  options: SearchParams,
  signal?: AbortSignal
): Promise<AlgoliaResponse> {
  const data = await fetchFromAlgolia(buildAlgoliaURL({ ...options, page: 0 }), signal);
  return { ...data, hits: sortHitsByStrategy(data.hits, options.sortBy) };
}

/** Slices one page out of a sorted window and rewrites the paging fields to match. */
export function pageSearchWindow(window: AlgoliaResponse, page: number): AlgoliaResponse {
  const start = page * HITS_PER_PAGE;
  return {
    ...window,
    hits: window.hits.slice(start, start + HITS_PER_PAGE),
    nbHits: Math.min(window.nbHits, window.hits.length),
    nbPages: Math.ceil(window.hits.length / HITS_PER_PAGE),
    page,
    hitsPerPage: HITS_PER_PAGE,
  };
}

export async function searchStories(
  options: SearchParams,
  signal?: AbortSignal
): Promise<AlgoliaResponse> {
  if (CLIENT_SORTS.has(options.sortBy)) {
    return pageSearchWindow(await fetchSearchWindow(options, signal), options.page);
  }

  return fetchFromAlgolia(buildAlgoliaURL(options), signal);
}
