import {
  buildAlgoliaURL,
  fetchFromAlgolia,
  sortHitsByStrategy,
} from "./algolia";
import type { AlgoliaResponse, DateRange, SortBy, StoryType } from "./types";

interface SearchOptions {
  query: string;
  storyType: StoryType;
  dateRange: DateRange;
  sortBy: SortBy;
  page: number;
}

export async function searchStories(options: SearchOptions): Promise<AlgoliaResponse> {
  const url = buildAlgoliaURL(
    options.query,
    options.storyType,
    options.dateRange,
    options.sortBy,
    options.page
  );

  const data = await fetchFromAlgolia(url);

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
