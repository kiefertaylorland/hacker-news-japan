import type { AlgoliaResponse, DateRange, HNStory, SearchParams, SortBy } from "../types";
import { HITS_PER_PAGE } from "../constants";

const ALGOLIA_API_BASE = "https://hn.algolia.com/api/v1";

/** Seconds to look back for each bounded date range; unbounded ranges are absent. */
const DATE_RANGE_SECONDS: Partial<Record<DateRange, number>> = {
  "24h": 86400,
  week: 604800,
  month: 2592000,
  year: 31536000,
};

/** Sorts the search endpoint cannot do server-side; applied client-side after fetching. */
export const CLIENT_SORTS: ReadonlySet<SortBy> = new Set(["points", "comments", "date_asc"]);

export function getUnixTimestamp(dateRange: DateRange): number | null {
  const seconds = DATE_RANGE_SECONDS[dateRange];
  return seconds === undefined ? null : Math.floor(Date.now() / 1000 - seconds);
}

export function buildAlgoliaURL({ query, storyType, dateRange, sortBy, page }: SearchParams): string {
  // Always prepend "Japan" to user query
  const fullQuery = query ? `Japan ${query}` : "Japan";

  // date_desc uses search_by_date (newest-first); everything else uses search and may
  // need client-side sorting (see CLIENT_SORTS).
  const endpoint = sortBy === "date_desc" ? "search_by_date" : "search";

  const params = new URLSearchParams({
    query: fullQuery,
    page: page.toString(),
    hitsPerPage: HITS_PER_PAGE.toString(),
  });

  // Exclude comments when unfiltered: they lack a title field and break card rendering
  params.append("tags", storyType === "all" ? "(story,ask_hn,show_hn,job)" : storyType);

  const unixTimestamp = getUnixTimestamp(dateRange);
  if (unixTimestamp !== null) {
    params.append("numericFilters", `created_at_i>${unixTimestamp}`);
  }

  if (sortBy === "date_desc") {
    params.append("advancedSyntax", "true");
  }

  return `${ALGOLIA_API_BASE}/${endpoint}?${params.toString()}`;
}

export async function fetchFromAlgolia(
  url: string,
  signal?: AbortSignal
): Promise<AlgoliaResponse> {
  let requestOptions: RequestInit | undefined;
  if (typeof window === "undefined") {
    requestOptions = {
      headers: {
        "User-Agent": "HN-Japan-Dashboard/1.0",
      },
    };
  }

  if (signal) {
    requestOptions = { ...requestOptions, signal };
  }

  const response = await fetch(url, requestOptions);

  if (!response.ok) {
    throw new Error(`Algolia API error: ${response.status}`);
  }

  return response.json() as Promise<AlgoliaResponse>;
}

const COMPARATORS: Record<SortBy, ((a: HNStory, b: HNStory) => number) | null> = {
  points: (a, b) => (b.points ?? 0) - (a.points ?? 0),
  comments: (a, b) => (b.num_comments ?? 0) - (a.num_comments ?? 0),
  date_asc: (a, b) => a.created_at_i - b.created_at_i,
  // Algolia already returns these in the correct order
  relevance: null,
  date_desc: null,
};

export function sortHitsByStrategy(hits: HNStory[], sortBy: SortBy): HNStory[] {
  const hitsCopy = [...hits];
  const compare = COMPARATORS[sortBy];
  return compare ? hitsCopy.sort(compare) : hitsCopy;
}
