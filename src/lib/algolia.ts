import type { AlgoliaResponse, DateRange, HNStory, SortBy, StoryType } from "./types";
import { HITS_PER_PAGE } from "./constants";

const ALGOLIA_API_BASE = "https://hn.algolia.com/api/v1";

export function getUnixTimestamp(dateRange: DateRange): number | null {
  const now = Date.now() / 1000; // Convert to seconds

  switch (dateRange) {
    case "24h":
      return Math.floor(now - 86400); // 24 hours
    case "week":
      return Math.floor(now - 604800); // 7 days
    case "month":
      return Math.floor(now - 2592000); // 30 days
    case "year":
      return Math.floor(now - 31536000); // 365 days
    case "all":
      return null;
    default:
      return null;
  }
}

export function buildAlgoliaURL(
  query: string,
  storyType: StoryType,
  dateRange: DateRange,
  sortBy: SortBy,
  page: number
): string {
  // Always prepend "Japan" to user query
  const fullQuery = query ? `Japan ${query}` : "Japan";

  // Choose endpoint based on sort preference
  const endpoint = sortBy === "relevance" ? "search" : "search_by_date";
  const baseUrl = `${ALGOLIA_API_BASE}/${endpoint}`;

  const params = new URLSearchParams({
    query: fullQuery,
    page: page.toString(),
    hitsPerPage: HITS_PER_PAGE.toString(),
  });

  // Add story type filter (exclude all others)
  if (storyType !== "all") {
    params.append("tags", storyType);
  } else {
    // Exclude comments — they lack a title field and break card rendering
    params.append("tags", "(story,ask_hn,show_hn,job)");
  }

  // Add date range filter
  const unixTimestamp = getUnixTimestamp(dateRange);
  if (unixTimestamp !== null) {
    params.append("numericFilters", `created_at_i>${unixTimestamp}`);
  }

  // Sort by date descending if date sort is requested
  if (sortBy === "date_desc") {
    params.append("advancedSyntax", "true");
  }

  return `${baseUrl}?${params.toString()}`;
}

export async function fetchFromAlgolia(
  url: string
): Promise<AlgoliaResponse> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "HN-Japan-Dashboard/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Algolia API error: ${response.status}`);
  }

  return response.json() as Promise<AlgoliaResponse>;
}

export function sortHitsByStrategy(
  hits: HNStory[],
  sortBy: SortBy
): HNStory[] {
  const hitsCopy = [...hits];

  switch (sortBy) {
    case "points":
      return hitsCopy.sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
    case "comments":
      return hitsCopy.sort((a, b) => (b.num_comments ?? 0) - (a.num_comments ?? 0));
    case "date_asc":
      return hitsCopy.sort((a, b) => a.created_at_i - b.created_at_i);
    case "relevance":
    case "date_desc":
      // Algolia already returns these in correct order
      return hitsCopy;
    default:
      return hitsCopy;
  }
}
