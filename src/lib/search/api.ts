import {
  buildAlgoliaURL,
  fetchFromAlgolia,
  sortHitsByStrategy,
} from "./algolia";
import type { AlgoliaResponse, SearchParams } from "../types";

export async function searchStories(
  options: SearchParams,
  signal?: AbortSignal
): Promise<AlgoliaResponse> {
  const url = buildAlgoliaURL(
    options.query,
    options.storyType,
    options.dateRange,
    options.sortBy,
    options.page
  );

  const data = await fetchFromAlgolia(url, signal);

  // Apply client-side sorting for sorts that need it
  // - points and comments: search endpoint returns by relevance, must be re-sorted
  // - date_asc: search endpoint returns by relevance, must be sorted by date ascending
  // date_desc doesn't need sorting (search_by_date returns newest-first)
  if (
    options.sortBy === "points" ||
    options.sortBy === "comments" ||
    options.sortBy === "date_asc"
  ) {
    data.hits = sortHitsByStrategy(data.hits, options.sortBy);
  }

  return data;
}
