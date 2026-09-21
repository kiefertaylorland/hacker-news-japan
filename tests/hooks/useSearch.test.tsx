import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearch } from "@/hooks/useSearch";
import { fetchSearchWindow, pageSearchWindow, searchStories } from "@/lib/search/api";
import type { AlgoliaResponse, SearchParams } from "@/lib/types";
import { makeResults, makeStory } from "../fixtures/stories";

let currentSearchParams = new URLSearchParams();
let pushState: ReturnType<typeof vi.spyOn>;
let replaceState: ReturnType<typeof vi.spyOn>;

vi.mock("next/navigation", () => ({
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@/lib/search/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/search/api")>()),
  searchStories: vi.fn(),
  fetchSearchWindow: vi.fn(),
}));

const mockedSearchStories = vi.mocked(searchStories);
const mockedFetchSearchWindow = vi.mocked(fetchSearchWindow);

const response = makeResults();

function deferredResponse() {
  let resolve!: (value: AlgoliaResponse) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<AlgoliaResponse>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function renderSearch() {
  const { result } = renderHook(() => useSearch());
  return result;
}

describe("useSearch", () => {
  beforeEach(() => {
    currentSearchParams = new URLSearchParams();
    pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    replaceState = vi.spyOn(window.history, "replaceState").mockImplementation(() => {});
    mockedSearchStories.mockReset();
    mockedFetchSearchWindow.mockReset();
  });

  it("reads initial URL params and fetches results", async () => {
    currentSearchParams = new URLSearchParams(
      "query=tokyo&storyType=job&dateRange=week&sortBy=points&page=2"
    );
    mockedFetchSearchWindow.mockResolvedValue(response);

    const { result } = renderHook(() => useSearch());

    expect(result.current.query).toBe("tokyo");
    expect(result.current.storyType).toBe("job");
    expect(result.current.dateRange).toBe("week");
    expect(result.current.sortBy).toBe("points");
    expect(result.current.page).toBe(2);

    await waitFor(() =>
      expect(mockedFetchSearchWindow).toHaveBeenCalledWith({
        query: "tokyo",
        storyType: "job",
        dateRange: "week",
        sortBy: "points",
        page: 2,
      }, expect.any(AbortSignal))
    );
    expect(mockedSearchStories).not.toHaveBeenCalled();

    await waitFor(() => expect(result.current.results).toEqual(pageSearchWindow(response, 2)));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it.each(["-1", "NaN"])("normalizes invalid page=%s URL params to the default page", async (page) => {
    currentSearchParams = new URLSearchParams(`query=tokyo&page=${page}`);
    mockedSearchStories.mockResolvedValue(response);

    const { result } = renderHook(() => useSearch());

    expect(result.current.page).toBe(0);
    await waitFor(() =>
      expect(mockedSearchStories).toHaveBeenCalledWith(
        {
          query: "tokyo",
          storyType: "all",
          dateRange: "all",
          sortBy: "date_desc",
          page: 0,
        },
        expect.any(AbortSignal)
      )
    );
  });

  it("syncs state when the URL search params change externally", async () => {
    mockedSearchStories.mockResolvedValue(response);
    const { result, rerender } = renderHook(() => useSearch());

    await waitFor(() => expect(mockedSearchStories).toHaveBeenCalledTimes(1));

    currentSearchParams = new URLSearchParams(
      "query=tokyo&storyType=job&dateRange=week&sortBy=points&page=2"
    );
    rerender();

    await waitFor(() => {
      expect(result.current.query).toBe("tokyo");
      expect(result.current.storyType).toBe("job");
      expect(result.current.dateRange).toBe("week");
      expect(result.current.sortBy).toBe("points");
      expect(result.current.page).toBe(2);
    });
  });

  it.each([
    ["a non-Error rejection", "boom", "Unknown error"],
    ["an Error rejection", new Error("Request failed"), "Request failed"],
  ])("surfaces %s and clears results", async (_label, reason, message) => {
    mockedSearchStories.mockRejectedValue(reason);

    const result = await renderSearch();

    await waitFor(() => expect(result.current.error).toBe(message));
    expect(result.current.results).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("updates URL and state through each setter", async () => {
    currentSearchParams = new URLSearchParams(
      "query=kyoto&storyType=story&dateRange=all&sortBy=date_desc&page=3"
    );
    mockedSearchStories.mockResolvedValue(response);

    const { result } = renderHook(() => useSearch());

    await waitFor(() => expect(mockedSearchStories).toHaveBeenCalledTimes(1));

    // Typing only updates state; the URL catches up once the query settles.
    act(() => {
      result.current.setQuery("osaka");
    });
    expect(result.current.page).toBe(0);
    expect(pushState).not.toHaveBeenCalled();

    act(() => {
      result.current.setStoryType("job");
    });
    expect(pushState).toHaveBeenLastCalledWith(
      null,
      "",
      "/?query=osaka&storyType=job&dateRange=all&sortBy=date_desc&page=0"
    );

    act(() => {
      result.current.setDateRange("month");
    });
    expect(pushState).toHaveBeenLastCalledWith(
      null,
      "",
      "/?query=osaka&storyType=job&dateRange=month&sortBy=date_desc&page=0"
    );

    act(() => {
      result.current.setSortBy("comments");
    });
    expect(pushState).toHaveBeenLastCalledWith(
      null,
      "",
      "/?query=osaka&storyType=job&dateRange=month&sortBy=comments&page=0"
    );
    expect(window.scrollTo).not.toHaveBeenCalled();

    act(() => {
      result.current.setPage(2);
    });
    expect(result.current.page).toBe(2);
    expect(pushState).toHaveBeenLastCalledWith(
      null,
      "",
      "/?query=osaka&storyType=job&dateRange=month&sortBy=comments&page=2"
    );
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0 });
  });

  it("does not refetch when the URL catches up with the state it produced", async () => {
    mockedSearchStories.mockResolvedValue(response);
    const { result, rerender } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => result.current.setStoryType("job"));
    const signal = mockedSearchStories.mock.lastCall![1]!;
    expect(mockedSearchStories).toHaveBeenCalledTimes(2);

    // Next dispatches a new searchParams object after our own pushState.
    currentSearchParams = new URLSearchParams(pushState.mock.lastCall![2] as string);
    rerender();
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(signal.aborted).toBe(false);
    expect(mockedSearchStories).toHaveBeenCalledTimes(2);
  });

  it("reuses the fetched window across page changes for client sorts", async () => {
    currentSearchParams = new URLSearchParams("sortBy=comments");
    const window = makeResults({
      hits: Array.from({ length: 65 }, (_, i) => makeStory({ objectID: String(i), num_comments: 65 - i })),
      nbHits: 19692,
    });
    mockedFetchSearchWindow.mockResolvedValue(window);
    const { result } = renderHook(() => useSearch());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedFetchSearchWindow).toHaveBeenCalledTimes(1);
    expect(result.current.results).toEqual(pageSearchWindow(window, 0));

    await act(async () => result.current.setPage(1));
    expect(mockedFetchSearchWindow).toHaveBeenCalledTimes(1);
    expect(result.current.results?.hits.map((hit) => hit.objectID)).toEqual(
      window.hits.slice(30, 60).map((hit) => hit.objectID)
    );
    expect(result.current.results).toMatchObject({ page: 1, nbPages: 3, nbHits: 65 });
    expect(result.current.isLoading).toBe(false);

    await act(async () => result.current.setDateRange("week"));
    expect(mockedFetchSearchWindow).toHaveBeenCalledTimes(2);
    expect(mockedFetchSearchWindow).toHaveBeenLastCalledWith(
      { query: "", storyType: "all", dateRange: "week", sortBy: "comments", page: 0 },
      expect.any(AbortSignal)
    );
    expect(mockedSearchStories).not.toHaveBeenCalled();
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
      () => result.current.setSortBy("relevance"),
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

  it.each(["success", "failure"] as const)(
    "aborts on unmount before a pending client-sort window resolves (%s)",
    async (outcome) => {
      currentSearchParams = new URLSearchParams("sortBy=comments");
      const pending = deferredResponse();
      mockedFetchSearchWindow.mockReturnValue(pending.promise);
      const render = vi.fn(() => useSearch());
      const { unmount } = renderHook(render);
      const signal = mockedFetchSearchWindow.mock.lastCall![1]!;
      expect(signal.aborted).toBe(false);
      unmount();
      expect(signal.aborted).toBe(true);
      const renderCount = render.mock.calls.length;

      await act(async () => {
        if (outcome === "success") pending.resolve(response);
        else pending.reject(new Error("unmounted error"));
      });
      expect(render).toHaveBeenCalledTimes(renderCount);
      expect(mockedFetchSearchWindow).toHaveBeenCalledTimes(1);
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
    expect(pushState).toHaveBeenCalledTimes(1);
    expect(pushState).toHaveBeenLastCalledWith(
      null,
      "",
      "/?query=osaka&storyType=job&dateRange=all&sortBy=date_desc&page=0"
    );

    await act(async () => vi.advanceTimersByTime(1));
    expect(mockedSearchStories).toHaveBeenCalledTimes(2);
    expect(mockedSearchStories).toHaveBeenLastCalledWith(
      { query: "osaka", storyType: "job", dateRange: "all", sortBy: "date_desc", page: 0 },
      expect.any(AbortSignal)
    );
    expect(result.current.results).toBe(response);
    expect(result.current.isLoading).toBe(false);
    // The filter click already wrote the typed query to the URL.
    expect(replaceState).not.toHaveBeenCalled();
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
    expect(replaceState).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(299));
    expect(mockedSearchStories).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => vi.advanceTimersByTime(300));
    expect(mockedSearchStories).toHaveBeenCalledTimes(1);
  });

  it("keeps previous results visible while a new query is debouncing, then syncs the URL once", async () => {
    vi.useRealTimers();
    mockedSearchStories.mockResolvedValue(response);
    const { result } = renderHook(() => useSearch());

    await waitFor(() => expect(result.current.results).toEqual(response));

    vi.useFakeTimers();
    act(() => result.current.setQuery("os"));
    act(() => result.current.setQuery("osa"));
    act(() => result.current.setQuery("osaka"));

    expect(result.current.results).toBe(response);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(true);
    expect(mockedSearchStories).toHaveBeenCalledTimes(1);
    expect(pushState).not.toHaveBeenCalled();
    expect(replaceState).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTime(300));
    expect(mockedSearchStories).toHaveBeenCalledTimes(2);
    expect(mockedSearchStories).toHaveBeenLastCalledWith(
      { query: "osaka", storyType: "all", dateRange: "all", sortBy: "date_desc", page: 0 },
      expect.any(AbortSignal)
    );
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/?query=osaka&storyType=all&dateRange=all&sortBy=date_desc&page=0"
    );
  });
  it("clears a previous error immediately once a new query starts debouncing", async () => {
    mockedSearchStories.mockRejectedValueOnce(new Error("first error")).mockResolvedValue(response);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.error).toBe("first error"));

    vi.useFakeTimers();
    act(() => result.current.setQuery("osaka"));
    expect(result.current.error).toBeNull();
    vi.useRealTimers();
  });

  it("clears an existing error when returning to the seeded server params", async () => {
    const paged = { ...response, page: 1 };
    mockedSearchStories.mockResolvedValueOnce(paged).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useSearch(response));

    await act(async () => result.current.setPage(1));
    await waitFor(() => expect(result.current.results).toBe(paged));

    await act(async () => result.current.setPage(2));
    await waitFor(() => expect(result.current.error).toBe("boom"));

    await act(async () => result.current.setPage(0));
    expect(result.current.error).toBeNull();
    expect(result.current.results).toBe(response);
  });

  it("clears a previous error when reverting to a cached client-sort window", async () => {
    currentSearchParams = new URLSearchParams("sortBy=comments");
    const windowResp = makeResults({ hits: [makeStory({ objectID: "1" })], nbHits: 1 });
    mockedFetchSearchWindow.mockResolvedValueOnce(windowResp).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.results).toEqual(pageSearchWindow(windowResp, 0)));

    await act(async () => result.current.setDateRange("week"));
    await waitFor(() => expect(result.current.error).toBe("boom"));

    await act(async () => result.current.setDateRange("all"));
    expect(result.current.error).toBeNull();
  });

  it("clears a previous error as soon as a new fetch starts", async () => {
    mockedSearchStories.mockRejectedValueOnce(new Error("first")).mockResolvedValue(response);
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.error).toBe("first"));

    const pending = deferredResponse();
    mockedSearchStories.mockReturnValueOnce(pending.promise);
    act(() => result.current.setPage(1));
    expect(result.current.error).toBeNull();
    await act(async () => pending.resolve(response));
  });

  it("clears previously loaded results when a later request fails", async () => {
    mockedSearchStories.mockResolvedValueOnce(response).mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.results).toBe(response));

    await act(async () => result.current.setPage(1));
    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.results).toBeNull();
  });

  it("does not repeat replaceState after the debounced query has already synced the URL", async () => {
    vi.useRealTimers();
    mockedSearchStories.mockResolvedValue(response);
    const { result, rerender } = renderHook(() => useSearch());
    await waitFor(() => expect(result.current.results).toEqual(response));

    vi.useFakeTimers();
    act(() => result.current.setQuery("osaka"));
    await act(async () => vi.advanceTimersByTime(300));
    expect(replaceState).toHaveBeenCalledTimes(1);
    vi.useRealTimers();

    // An external URL change (e.g. browser back/forward) re-runs the fetch effect without
    // going through navigate(), which is the only other place queryDirtyRef is reset.
    currentSearchParams = new URLSearchParams("query=osaka&page=1");
    rerender();
    await waitFor(() => expect(result.current.page).toBe(1));

    expect(replaceState).toHaveBeenCalledTimes(1);
  });

  it("does not cache a stale aborted client-sort window response", async () => {
    currentSearchParams = new URLSearchParams("sortBy=comments");
    const stale = deferredResponse();
    const fresh = makeResults({ hits: [makeStory({ objectID: "fresh" })], nbHits: 1 });
    mockedFetchSearchWindow.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(fresh);

    const { result } = renderHook(() => useSearch());
    const staleSignal = mockedFetchSearchWindow.mock.lastCall![1]!;

    // A page change re-runs the effect before the mount fetch settles: aborts the first
    // request and starts a second with the same window key.
    act(() => result.current.setPage(1));
    expect(staleSignal.aborted).toBe(true);
    await waitFor(() => expect(result.current.results).toEqual(pageSearchWindow(fresh, 1)));
    expect(mockedFetchSearchWindow).toHaveBeenCalledTimes(2);

    // The aborted first request resolves later with different data; it must not clobber the cache.
    const staleData = makeResults({ hits: [makeStory({ objectID: "stale" })], nbHits: 1 });
    await act(async () => stale.resolve(staleData));

    await act(async () => result.current.setPage(0));
    expect(mockedFetchSearchWindow).toHaveBeenCalledTimes(2);
    expect(result.current.results).toEqual(pageSearchWindow(fresh, 0));
  });

  describe("with server-provided initial results", () => {
    it("seeds results and skips the mount fetch", async () => {
      const { result } = renderHook(() => useSearch(response));

      expect(result.current.results).toBe(response);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      await waitFor(() => expect(result.current.results).toBe(response));
      expect(mockedSearchStories).not.toHaveBeenCalled();
    });

    it("fetches after a change and restores the seed when returning to the initial params", async () => {
      const paged = { ...response, page: 1 };
      mockedSearchStories.mockResolvedValue(paged);
      const { result } = renderHook(() => useSearch(response));

      await act(async () => result.current.setPage(1));
      await waitFor(() => expect(result.current.results).toBe(paged));
      expect(mockedSearchStories).toHaveBeenCalledTimes(1);

      await act(async () => result.current.setPage(0));
      expect(result.current.results).toBe(response);
      expect(result.current.isLoading).toBe(false);
      expect(mockedSearchStories).toHaveBeenCalledTimes(1);
    });

    it("fetches on the first filter change before the URL has caught up with pushState", async () => {
      const initialParams: SearchParams = {
        query: "",
        storyType: "all",
        dateRange: "all",
        sortBy: "date_desc",
        page: 0,
      };
      const sorted = { ...response, query: "sorted" };
      mockedFetchSearchWindow.mockResolvedValue(sorted);
      mockedSearchStories.mockResolvedValue(sorted);
      const { result } = renderHook(() => useSearch(response, initialParams));
      expect(mockedSearchStories).not.toHaveBeenCalled();
      expect(mockedFetchSearchWindow).not.toHaveBeenCalled();

      // useSearchParams still reports the server URL here: Next syncs it asynchronously.
      await act(async () => result.current.setSortBy("points"));
      expect(mockedFetchSearchWindow).toHaveBeenCalledTimes(1);
      expect(mockedFetchSearchWindow).toHaveBeenCalledWith(
        { ...initialParams, sortBy: "points" },
        expect.any(AbortSignal)
      );
      await waitFor(() => expect(result.current.results).toEqual(pageSearchWindow(sorted, 0)));

      await act(async () => result.current.setSortBy("relevance"));
      expect(mockedSearchStories).toHaveBeenCalledTimes(1);
      expect(mockedSearchStories).toHaveBeenCalledWith(
        { ...initialParams, sortBy: "relevance" },
        expect.any(AbortSignal)
      );
      await waitFor(() => expect(result.current.results).toBe(sorted));

      await act(async () => result.current.setStoryType("job"));
      expect(mockedSearchStories).toHaveBeenCalledTimes(2);
      expect(mockedSearchStories).toHaveBeenLastCalledWith(
        { ...initialParams, sortBy: "relevance", storyType: "job" },
        expect.any(AbortSignal)
      );
    });

    it("uses new server results after search-param navigation without fetching", async () => {
      const paged = { ...response, page: 1 };
      const initialParams: SearchParams = {
        query: "",
        storyType: "all",
        dateRange: "all",
        sortBy: "date_desc",
        page: 0,
      };
      const { result, rerender } = renderHook(
        ({ results, params }) => useSearch(results, params),
        { initialProps: { results: response, params: initialParams } }
      );

      expect(result.current.results).toBe(response);
      expect(mockedSearchStories).not.toHaveBeenCalled();

      currentSearchParams = new URLSearchParams("page=1");
      rerender({
        results: paged,
        params: { ...initialParams, page: 1 },
      });

      await waitFor(() => expect(result.current.results).toBe(paged));
      // State catches up one render after the props; any request started in between is aborted.
      for (const call of mockedSearchStories.mock.calls) {
        expect(call[1]!.aborted).toBe(true);
      }
      expect(result.current.isLoading).toBe(false);
    });
  });
});
