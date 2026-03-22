export interface HNStory {
  objectID: string;
  title: string;
  url: string | null;
  author: string;
  points: number | null;
  num_comments: number | null;
  created_at: string;
  created_at_i: number;
  _tags: string[];
  story_id: number;
}

export interface AlgoliaResponse {
  hits: HNStory[];
  nbHits: number;
  nbPages: number;
  page: number;
  hitsPerPage: number;
  query: string;
  processingTimeMS?: number;
}

export interface SearchParams {
  query: string;
  storyType: StoryType;
  dateRange: DateRange;
  sortBy: SortBy;
  page: number;
}

export type StoryType = "story" | "ask_hn" | "show_hn" | "job" | "all";
export type DateRange = "24h" | "week" | "month" | "year" | "all";
export type SortBy = "relevance" | "date_desc" | "date_asc" | "points" | "comments";
