import { renderHook, act, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearch } from "@/hooks/useSearch";
import { searchStories } from "@/lib/api";
import type { AlgoliaResponse } from "@/lib/types";

let currentSearchParams = new URLSearchParams();
const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@/lib/api", () => ({
  searchStories: vi.fn(),
}));

const mockedSearchStories = vi.mocked(searchStories);

const response: AlgoliaResponse = {
  hits: [
    {
      objectID: "1",
      title: "Japan story",
      url: "https://example.com",
      author: "alice",
      points: 10,
      num_comments: 3,
      created_at: "2024-01-01T00:00:00.000Z",
      created_at_i: 1,
      _tags: ["story"],
      story_id: 1,
    },
  ],
  nbHits: 1,
  nbPages: 3,
  page: 0,
  hitsPerPage: 30,
  query: "Japan",
};

describe("hooks", () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    pushMock.mockReset();
    mockedSearchStories.mockReset();
  });

  it("returns the current value immediately from useDebounce", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDebounce("tokyo"));
    expect(result.current).toBe("tokyo");
  });

  it("debounces updates until the delay has elapsed", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) => useDebounce(value, delay),
      {
        initialProps: { value: "tokyo", delay: 300 },
      }
    );

    rerender({ value: "osaka", delay: 300 });
    expect(result.current).toBe("tokyo");

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("tokyo");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("osaka");
  });

  it("cancels stale debounce timers on rerender", () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      {
        initialProps: { value: "tokyo" },
      }
    );

    rerender({ value: "kyoto" });
    act(() => {
      vi.advanceTimersByTime(150);
    });
    rerender({ value: "nagoya" });

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(result.current).toBe("tokyo");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("nagoya");
  });

  it("reads initial URL params and fetches results", async () => {
    currentSearchParams = new URLSearchParams(
      "query=tokyo&storyType=job&dateRange=week&sortBy=points&page=2"
    );
    mockedSearchStories.mockResolvedValue(response);

    const { result } = renderHook(() => useSearch());

    expect(result.current.query).toBe("tokyo");
    expect(result.current.storyType).toBe("job");
    expect(result.current.dateRange).toBe("week");
    expect(result.current.sortBy).toBe("points");
    expect(result.current.page).toBe(2);

    await waitFor(() =>
      expect(mockedSearchStories).toHaveBeenCalledWith({
        query: "tokyo",
        storyType: "job",
        dateRange: "week",
        sortBy: "points",
        page: 2,
      })
    );

    await waitFor(() => expect(result.current.results).toEqual(response));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("surfaces unknown errors and clears results", async () => {
    mockedSearchStories.mockRejectedValue("boom");

    const { result } = renderHook(() => useSearch());

    await waitFor(() => expect(result.current.error).toBe("Unknown error"));
    expect(result.current.results).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("surfaces Error messages from failed searches", async () => {
    mockedSearchStories.mockRejectedValue(new Error("Request failed"));

    const { result } = renderHook(() => useSearch());

    await waitFor(() => expect(result.current.error).toBe("Request failed"));
    expect(result.current.results).toBeNull();
  });

  it("updates URL and state through each setter", async () => {
    currentSearchParams = new URLSearchParams(
      "query=kyoto&storyType=story&dateRange=all&sortBy=date_desc&page=3"
    );
    mockedSearchStories.mockResolvedValue(response);

    const { result } = renderHook(() => useSearch());

    await waitFor(() => expect(mockedSearchStories).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setQuery("osaka");
    });
    expect(result.current.page).toBe(0);
    expect(pushMock).toHaveBeenLastCalledWith(
      "/?query=osaka&storyType=story&dateRange=all&sortBy=date_desc&page=0",
      { scroll: false }
    );

    act(() => {
      result.current.setStoryType("job");
    });
    expect(pushMock).toHaveBeenLastCalledWith(
      "/?query=osaka&storyType=job&dateRange=all&sortBy=date_desc&page=0",
      { scroll: false }
    );

    act(() => {
      result.current.setDateRange("month");
    });
    expect(pushMock).toHaveBeenLastCalledWith(
      "/?query=osaka&storyType=job&dateRange=month&sortBy=date_desc&page=0",
      { scroll: false }
    );

    act(() => {
      result.current.setSortBy("comments");
    });
    expect(pushMock).toHaveBeenLastCalledWith(
      "/?query=osaka&storyType=job&dateRange=month&sortBy=comments&page=0",
      { scroll: false }
    );

    act(() => {
      result.current.setPage(2);
    });
    expect(pushMock).toHaveBeenLastCalledWith(
      "/?query=osaka&storyType=job&dateRange=month&sortBy=comments&page=2",
      { scroll: false }
    );
  });
});
