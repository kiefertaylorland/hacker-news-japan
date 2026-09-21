import { vi } from "vitest";
import type { useSearch } from "@/hooks/useSearch";

type SearchState = ReturnType<typeof useSearch>;

/** Full useSearch return shape with vi.fn() setters, for mocking the hook in component tests. */
export function mockSearchState(overrides: Partial<SearchState> = {}): SearchState {
  return {
    query: "",
    storyType: "all",
    dateRange: "all",
    sortBy: "date_desc",
    page: 0,
    results: null,
    isLoading: false,
    error: null,
    setQuery: vi.fn(),
    setStoryType: vi.fn(),
    setDateRange: vi.fn(),
    setSortBy: vi.fn(),
    setPage: vi.fn(),
    ...overrides,
  };
}
