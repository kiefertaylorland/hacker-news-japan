import { DEFAULT_SEARCH_PARAMS } from "../constants";
import type { DateRange, SearchParams, SortBy, StoryType } from "../types";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export function readSearchParams(searchParams: URLSearchParams): SearchParams {
  // Stryker disable next-line StringLiteral: any non-numeric fallback parses to the same NaN,
  // and a present, non-empty "page" value always wins the `||` before this fallback is read.
  const page = Number.parseInt(searchParams.get("page") || "", 10);
  return {
    query: searchParams.get("query") || DEFAULT_SEARCH_PARAMS.query,
    storyType: (searchParams.get("storyType") as StoryType) || DEFAULT_SEARCH_PARAMS.storyType,
    dateRange: (searchParams.get("dateRange") as DateRange) || DEFAULT_SEARCH_PARAMS.dateRange,
    sortBy: (searchParams.get("sortBy") as SortBy) || DEFAULT_SEARCH_PARAMS.sortBy,
    // Stryker disable next-line EqualityOperator: DEFAULT_SEARCH_PARAMS.page is 0, the same
    // value `page` already holds at the `<`/`<=` boundary, so the two operators produce the
    // same output page number.
    page: Number.isNaN(page) || page < 0 ? DEFAULT_SEARCH_PARAMS.page : page,
  };
}

/** Converts the App Router `searchParams` record into URLSearchParams (first value wins). */
export function searchParamsFromRecord(record: SearchParamsRecord): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(record)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) params.set(key, first);
  }
  return params;
}

export function toSearchUrl(params: SearchParams): string {
  const query = new URLSearchParams({
    query: params.query,
    storyType: params.storyType,
    dateRange: params.dateRange,
    sortBy: params.sortBy,
    page: params.page.toString(),
  });
  return `/?${query.toString()}`;
}

export function sameSearchParams(left: SearchParams, right: SearchParams): boolean {
  return (
    left.query === right.query &&
    left.storyType === right.storyType &&
    left.dateRange === right.dateRange &&
    left.sortBy === right.sortBy &&
    left.page === right.page
  );
}
