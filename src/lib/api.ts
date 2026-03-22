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

  if (options.sortBy === "points" || options.sortBy === "comments") {
    data.hits = sortHitsByStrategy(data.hits, options.sortBy);
  }

  return data;
}
