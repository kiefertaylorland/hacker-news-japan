import { buildAlgoliaURL, CLIENT_SORTS, fetchFromAlgolia, sortHitsByStrategy } from "./algolia";
import type { AlgoliaResponse, SearchParams } from "../types";

export async function searchStories(
  options: SearchParams,
  signal?: AbortSignal
): Promise<AlgoliaResponse> {
  const data = await fetchFromAlgolia(buildAlgoliaURL(options), signal);

  if (CLIENT_SORTS.has(options.sortBy)) {
    data.hits = sortHitsByStrategy(data.hits, options.sortBy);
  }

  return data;
}
