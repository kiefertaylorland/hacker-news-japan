import type { DateRange, StoryType, SortBy } from "./types";

export const HITS_PER_PAGE = 30;

export const STORY_TYPE_OPTIONS: { label: string; value: StoryType }[] = [
  { label: "All Stories", value: "all" },
  { label: "Stories", value: "story" },
  { label: "Ask HN", value: "ask_hn" },
  { label: "Show HN", value: "show_hn" },
  { label: "Jobs", value: "job" },
];

export const DATE_RANGE_OPTIONS: { label: string; value: DateRange }[] = [
  { label: "Past 24h", value: "24h" },
  { label: "Past Week", value: "week" },
  { label: "Past Month", value: "month" },
  { label: "Past Year", value: "year" },
  { label: "All Time", value: "all" },
];

export const SORT_BY_OPTIONS: { label: string; value: SortBy }[] = [
  { label: "Relevance", value: "relevance" },
  { label: "Newest", value: "date_desc" },
  { label: "Oldest", value: "date_asc" },
  { label: "Points", value: "points" },
  { label: "Comments", value: "comments" },
];

export const DEFAULT_SEARCH_PARAMS = {
  query: "",
  storyType: "all" as const,
  dateRange: "all" as const,
  sortBy: "relevance" as const,
  page: 0,
};
