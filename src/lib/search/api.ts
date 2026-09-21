import { buildAlgoliaURL, CLIENT_SORTS, fetchFromAlgolia, sortHitsByStrategy } from "./algolia";
import { HITS_PER_PAGE } from "../constants";
import type { AlgoliaResponse, SearchParams } from "../types";

export async function searchStories(
  options: SearchParams,
  signal?: AbortSignal
): Promise<AlgoliaResponse> {
  const data = await fetchFromAlgolia(buildAlgoliaURL(options), signal);

  if (CLIENT_SORTS.has(options.sortBy)) {
    // The response holds the whole CLIENT_SORT_WINDOW; sort it once and page locally.
    const sorted = sortHitsByStrategy(data.hits, options.sortBy);
    const start = options.page * HITS_PER_PAGE;
    return {
      ...data,
      hits: sorted.slice(start, start + HITS_PER_PAGE),
      nbHits: Math.min(data.nbHits, sorted.length),
      nbPages: Math.ceil(sorted.length / HITS_PER_PAGE),
      page: options.page,
      hitsPerPage: HITS_PER_PAGE,
    };
  }

  return data;
}
