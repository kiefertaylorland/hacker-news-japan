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

  // Only apply client-side sorting for date_asc (search_by_date always returns newest-first)
  if (options.sortBy === "date_asc") {
    data.hits = sortHitsByStrategy(data.hits, options.sortBy);
  }

  return data;
}
