import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimisticBookmarks } from "@/hooks/useOptimisticBookmarks";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import { makeStory, sampleStory } from "../fixtures/stories";

vi.mock("@/lib/bookmarks/actions", () => ({
  toggleBookmark: vi.fn(),
}));

const mockedToggleBookmark = vi.mocked(toggleBookmark);

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function renderWithSavedIds(savedIds: string[] = []) {
  return renderHook(() => useOptimisticBookmarks(savedIds));
}

function renderWithRerenderableSavedIds() {
  return renderHook(
    ({ savedIds }: { savedIds: string[] }) => useOptimisticBookmarks(savedIds),
    { initialProps: { savedIds: [] as string[] } }
  );
}

function toggleOnce(result: { current: ReturnType<typeof useOptimisticBookmarks> }, story = sampleStory) {
  act(() => {
    result.current.toggle(story);
  });
}

async function toggleAndExpectCallCount(
  result: { current: ReturnType<typeof useOptimisticBookmarks> },
  count: number,
  story = sampleStory
) {
  toggleOnce(result, story);
  await waitFor(() => expect(mockedToggleBookmark).toHaveBeenCalledTimes(count));
}

describe("useOptimisticBookmarks", () => {
  beforeEach(() => {
    mockedToggleBookmark.mockReset();
    mockedToggleBookmark.mockResolvedValue(undefined);
  });

  it("bases rapid toggles on the last intended saved state", async () => {
    const { result } = renderWithSavedIds();

    act(() => {
      result.current.toggle(sampleStory);
      result.current.toggle(sampleStory);
    });

    await waitFor(() => expect(mockedToggleBookmark).toHaveBeenCalledTimes(2));
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(1, sampleStory, false);
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(2, sampleStory, true);
  });

  it("keeps a stable toggle identity across rerenders", () => {
    const savedIds: string[] = [];
    const { result, rerender } = renderHook(() => useOptimisticBookmarks(savedIds));
    const first = result.current.toggle;
    rerender();
    expect(result.current.toggle).toBe(first);
  });

  it("removes only the toggled id when unsaving, keeping other saved ids", async () => {
    const { result } = renderWithSavedIds(["other", sampleStory.objectID]);

    toggleOnce(result);

    await waitFor(() => expect(result.current.savedIds).toEqual(["other"]));
  });

  it("adds the toggled id when saving", async () => {
    const { result } = renderWithSavedIds();

    toggleOnce(result);

    await waitFor(() => expect(result.current.savedIds).toEqual([sampleStory.objectID]));
  });

  it("clears the pending flag after settling so a later toggle uses the settled state", async () => {
    const { result } = renderWithSavedIds();

    await toggleAndExpectCallCount(result, 1);
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(1, sampleStory, false);

    // With no parent update to `savedIds`, the settled optimistic state reverts to [].
    await waitFor(() => expect(result.current.savedIds).toEqual([]));

    await toggleAndExpectCallCount(result, 2);
    // If the pending flag were never cleared, this would incorrectly read as already-saved.
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(2, sampleStory, false);
  });

  it("keeps a newer pending intent when an older overlapping toggle settles and the list revalidates", async () => {
    const first = deferred();
    const second = deferred();
    mockedToggleBookmark.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValue(undefined);

    const { result, rerender } = renderWithRerenderableSavedIds();

    act(() => {
      result.current.toggle(sampleStory); // save intent, isSaved arg = false
    });
    act(() => {
      result.current.toggle(sampleStory); // unsave intent, isSaved arg = true
    });
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(1, sampleStory, false);
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(2, sampleStory, true);

    // The first (older) toggle settles while the second is still pending; its cleanup must not
    // clobber the second toggle's still-pending intent.
    await act(async () => first.resolve());

    // Revalidation lands mid-flight: the server confirms the *first* toggle's effect, which
    // resets the optimistic baseline out from under the still-pending second toggle.
    rerender({ savedIds: [sampleStory.objectID] });

    // A correctly-preserved pending flag means this toggle still sees the second toggle's
    // "now unsaved" intent, not the revalidated (and now stale) optimistic baseline.
    await toggleAndExpectCallCount(result, 3);
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(3, sampleStory, false);

    await act(async () => second.resolve());
  });

  it("uses the latest optimistic ids for a fresh toggle after savedIds changes", async () => {
    const nowSaved = "999";
    const story = makeStory({ objectID: nowSaved });
    const { result, rerender } = renderWithRerenderableSavedIds();

    rerender({ savedIds: [nowSaved] });

    await toggleAndExpectCallCount(result, 1, story);
    expect(mockedToggleBookmark).toHaveBeenCalledWith(story, true);
  });
});
