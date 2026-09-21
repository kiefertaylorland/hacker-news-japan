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

function renderBookmarks(savedIds: string[] = []) {
  const hook = renderHook(
    ({ savedIds }: { savedIds: string[] }) => useOptimisticBookmarks(savedIds),
    { initialProps: { savedIds } }
  );
  return {
    ...hook,
    toggle: (story = sampleStory) => act(() => hook.result.current.toggle(story)),
  };
}

describe("useOptimisticBookmarks", () => {
  beforeEach(() => {
    mockedToggleBookmark.mockReset();
    mockedToggleBookmark.mockResolvedValue(undefined);
  });

  it("bases rapid toggles on the last intended saved state", async () => {
    const { result } = renderHook(() => useOptimisticBookmarks([]));

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

  it.each<[string, string[], string[]]>([
    ["removes only the toggled id when unsaving, keeping other saved ids", ["other", sampleStory.objectID], ["other"]],
    ["adds the toggled id when saving", [], [sampleStory.objectID]],
  ])("%s", async (_label, savedIds, expected) => {
    const { result, toggle } = renderBookmarks(savedIds);
    toggle();
    await waitFor(() => expect(result.current.savedIds).toEqual(expected));
  });

  it("clears the pending flag after settling so a later toggle uses the settled state", async () => {
    const { result, toggle } = renderBookmarks();

    toggle();
    await waitFor(() => expect(mockedToggleBookmark).toHaveBeenCalledTimes(1));
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(1, sampleStory, false);

    // With no parent update to `savedIds`, the settled optimistic state reverts to [].
    await waitFor(() => expect(result.current.savedIds).toEqual([]));

    toggle();
    await waitFor(() => expect(mockedToggleBookmark).toHaveBeenCalledTimes(2));
    // If the pending flag were never cleared, this would incorrectly read as already-saved.
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(2, sampleStory, false);
  });

  it("keeps a newer pending intent when an older overlapping toggle settles and the list revalidates", async () => {
    const first = deferred();
    const second = deferred();
    mockedToggleBookmark.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValue(undefined);

    const { toggle, rerender } = renderBookmarks();

    toggle(); // save intent, isSaved arg = false
    toggle(); // unsave intent, isSaved arg = true
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(1, sampleStory, false);
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(2, sampleStory, true);

    // The first (older) toggle settles while the second is still pending; its cleanup must not
    // clobber the second toggle's still-pending intent.
    await act(async () => first.resolve());

    // Revalidation lands mid-flight: the server confirms the *first* toggle's effect, which
    // resets the optimistic baseline out from under the still-pending second toggle.
    rerender({ savedIds: [sampleStory.objectID] });

    toggle();
    await waitFor(() => expect(mockedToggleBookmark).toHaveBeenCalledTimes(3));
    // A correctly-preserved pending flag means this toggle still sees the second toggle's
    // "now unsaved" intent, not the revalidated (and now stale) optimistic baseline.
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(3, sampleStory, false);

    await act(async () => second.resolve());
  });

  it("uses the latest optimistic ids for a fresh toggle after savedIds changes", async () => {
    const nowSaved = "999";
    const story = makeStory({ objectID: nowSaved });
    const { toggle, rerender } = renderBookmarks();

    rerender({ savedIds: [nowSaved] });

    toggle(story);

    await waitFor(() => expect(mockedToggleBookmark).toHaveBeenCalledTimes(1));
    expect(mockedToggleBookmark).toHaveBeenCalledWith(story, true);
  });
});
