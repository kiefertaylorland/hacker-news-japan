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

function deferredResponse() {
  let resolve!: (value: AlgoliaResponse) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<AlgoliaResponse>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

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
      }, expect.any(AbortSignal))
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

  it("aborts requests when each filter or page changes", async () => {
    mockedSearchStories.mockResolvedValue(response);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedSearchStories).toHaveBeenCalledWith(
      { query: "", storyType: "all", dateRange: "all", sortBy: "date_desc", page: 0 },
      expect.any(AbortSignal)
    );

    const changes = [
      () => result.current.setStoryType("job"),
      () => result.current.setDateRange("week"),
      () => result.current.setSortBy("points"),
      () => result.current.setPage(2),
    ];
    for (const change of changes) {
      const previousSignal = mockedSearchStories.mock.lastCall![1]!;
      expect(previousSignal.aborted).toBe(false);
      await act(async () => change());
      expect(previousSignal.aborted).toBe(true);
      expect(mockedSearchStories.mock.lastCall![1]!.aborted).toBe(false);
    }
    expect(mockedSearchStories).toHaveBeenCalledTimes(5);
  });

  it.each(["success", "failure"] as const)(
    "ignores stale %s and finally before and after the latest request settles",
    async (outcome) => {
      const first = deferredResponse();
      const second = deferredResponse();
      const latest = deferredResponse();
      mockedSearchStories
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise)
        .mockReturnValueOnce(latest.promise);
      const { result } = renderHook(() => useSearch());
      act(() => result.current.setPage(1));
      act(() => result.current.setPage(2));

      await act(async () => {
        if (outcome === "success") second.resolve(response);
        else second.reject(new Error("obsolete error"));
      });
      expect(result.current.results).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(true);

      const latestResponse = { ...response, page: 2 };
      await act(async () => latest.resolve(latestResponse));
      expect(result.current.results).toBe(latestResponse);
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        if (outcome === "success") first.resolve(response);
        else first.reject(new Error("older error"));
      });
      expect(result.current.results).toBe(latestResponse);
      expect(result.current.error).toBeNull();
      expect(result.current.isLoading).toBe(false);
    }
  );

  it("preserves the latest error when an older request succeeds", async () => {
    const old = deferredResponse();
    mockedSearchStories
      .mockReturnValueOnce(old.promise)
      .mockRejectedValueOnce(new Error("latest error"));
    const { result } = renderHook(() => useSearch());
    await act(async () => result.current.setPage(1));
    expect(result.current.error).toBe("latest error");

    await act(async () => old.resolve(response));
    expect(result.current.results).toBeNull();
    expect(result.current.error).toBe("latest error");
    expect(result.current.isLoading).toBe(false);
  });

  it.each(["success", "failure"] as const)(
    "aborts on unmount and ignores a subsequent %s",
    async (outcome) => {
      const pending = deferredResponse();
      mockedSearchStories.mockReturnValue(pending.promise);
      const render = vi.fn(() => useSearch());
      const { unmount } = renderHook(render);
      const signal = mockedSearchStories.mock.lastCall![1]!;
      expect(signal.aborted).toBe(false);
      unmount();
      expect(signal.aborted).toBe(true);
      const renderCount = render.mock.calls.length;

      await act(async () => {
        if (outcome === "success") pending.resolve(response);
        else pending.reject(new Error("unmounted error"));
      });
      expect(render).toHaveBeenCalledTimes(renderCount);
      expect(mockedSearchStories).toHaveBeenCalledTimes(1);
    }
  );

  it("defers rapid input from a nonzero page until the latest query settles", async () => {
    vi.useFakeTimers();
    currentSearchParams = new URLSearchParams("query=tokyo&page=3");
    const old = deferredResponse();
    mockedSearchStories
      .mockReturnValueOnce(old.promise)
      .mockResolvedValue(response);
    const { result } = renderHook(() => useSearch());
    const signal = mockedSearchStories.mock.lastCall![1]!;

    act(() => result.current.setQuery("o"));
    expect(signal.aborted).toBe(true);
    expect(result.current.page).toBe(0);
    expect(mockedSearchStories).toHaveBeenCalledTimes(1);
    await act(async () => old.reject(new Error("obsolete query")));
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => vi.advanceTimersByTime(150));
    act(() => result.current.setQuery("osaka"));
    act(() => result.current.setStoryType("job"));
    await act(async () => vi.advanceTimersByTime(299));
    expect(mockedSearchStories).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenLastCalledWith(
      "/?query=osaka&storyType=job&dateRange=all&sortBy=date_desc&page=0",
      { scroll: false }
    );

    await act(async () => vi.advanceTimersByTime(1));
    expect(mockedSearchStories).toHaveBeenCalledTimes(2);
    expect(mockedSearchStories).toHaveBeenLastCalledWith(
      { query: "osaka", storyType: "job", dateRange: "all", sortBy: "date_desc", page: 0 },
      expect.any(AbortSignal)
    );
    expect(result.current.results).toBe(response);
    expect(result.current.isLoading).toBe(false);
  });

  it("aborts query changes on page zero and cancels a pending debounce on unmount", async () => {
    vi.useFakeTimers();
    const old = deferredResponse();
    mockedSearchStories.mockReturnValue(old.promise);
    const { result, unmount } = renderHook(() => useSearch());
    const signal = mockedSearchStories.mock.lastCall![1]!;

    act(() => result.current.setQuery("kyoto"));
    expect(result.current.page).toBe(0);
    expect(signal.aborted).toBe(true);
    await act(async () => old.resolve(response));
    expect(result.current.results).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => vi.advanceTimersByTime(299));
    expect(mockedSearchStories).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => vi.advanceTimersByTime(300));
    expect(mockedSearchStories).toHaveBeenCalledTimes(1);
  });
});
