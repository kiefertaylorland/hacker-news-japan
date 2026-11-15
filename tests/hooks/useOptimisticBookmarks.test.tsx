import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimisticBookmarks } from "@/hooks/useOptimisticBookmarks";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import { makeStory, sampleStory } from "../fixtures/stories";

vi.mock("@/lib/bookmarks/actions", () => ({ toggleBookmark: vi.fn() }));
const mockedToggleBookmark = vi.mocked(toggleBookmark);

function deferred() {
  let resolve!: () => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<void>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

function renderBookmarks(savedIds: string[] = []) {
  return renderHook(({ ids }) => useOptimisticBookmarks(ids), { initialProps: { ids: savedIds } });
}

describe("useOptimisticBookmarks", () => {
  beforeEach(() => {
    mockedToggleBookmark.mockReset();
    mockedToggleBookmark.mockResolvedValue(undefined);
  });

  it("starts idle without pending operations, errors or a status announcement", () => {
    const { result } = renderBookmarks();
    expect(result.current.pendingIds).toEqual([]);
    expect(result.current.errors).toEqual({});
    expect(result.current.message).toBe("");
  });

  it("prevents duplicate requests synchronously while showing the optimistic saved state", async () => {
    const pending = deferred();
    mockedToggleBookmark.mockReturnValue(pending.promise);
    const { result } = renderBookmarks();
    act(() => { result.current.toggle(sampleStory); result.current.toggle(sampleStory); });
    expect(mockedToggleBookmark).toHaveBeenCalledTimes(1);
    expect(mockedToggleBookmark).toHaveBeenCalledWith(sampleStory, false);
    expect(result.current.pendingIds).toEqual([sampleStory.objectID]);
    expect(result.current.savedIds).toEqual([sampleStory.objectID]);
    expect(result.current.message).toBe("Saving story…");
    await act(async () => pending.resolve());
    expect(result.current.pendingIds).toEqual([]);
    expect(result.current.message).toBe("Story saved.");
  });

  it("keeps a stable toggle identity across unchanged rerenders", () => {
    const ids: string[] = [];
    const { result, rerender } = renderBookmarks(ids);
    const toggle = result.current.toggle;
    rerender({ ids });
    expect(result.current.toggle).toBe(toggle);
  });

  it("optimistically removes only the selected bookmark and announces completion", async () => {
    const pending = deferred();
    mockedToggleBookmark.mockReturnValue(pending.promise);
    const { result } = renderBookmarks(["other", sampleStory.objectID]);
    act(() => result.current.toggle(sampleStory));
    expect(result.current.savedIds).toEqual(["other"]);
    expect(result.current.message).toBe("Removing bookmark…");
    expect(mockedToggleBookmark).toHaveBeenCalledWith(sampleStory, true);
    await act(async () => pending.resolve());
    expect(result.current.message).toBe("Bookmark removed.");
    expect(result.current.pendingIds).toEqual([]);
  });

  it.each([false, true])("rolls back a failed mutation from saved=%s and retries using the restored state", async (saved) => {
    const first = deferred();
    const retry = deferred();
    mockedToggleBookmark.mockReturnValueOnce(first.promise).mockReturnValueOnce(retry.promise);
    const ids = saved ? [sampleStory.objectID] : [];
    const { result } = renderBookmarks(ids);
    act(() => result.current.toggle(sampleStory));
    expect(result.current.savedIds.includes(sampleStory.objectID)).toBe(!saved);
    await act(async () => first.reject(new Error("offline")));
    expect(result.current.savedIds).toEqual(ids);
    expect(result.current.pendingIds).toEqual([]);
    expect(result.current.errors[sampleStory.objectID]).toContain("previous saved state has been restored");
    expect(result.current.message).toBe("");
    act(() => result.current.retryFailed(sampleStory.objectID));
    expect(result.current.errors).toEqual({});
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(2, sampleStory, saved);
    await act(async () => retry.resolve());
    expect(result.current.errors).toEqual({});
    expect(result.current.message).toBe(saved ? "Bookmark removed." : "Story saved.");
  });

  it("allows different stories to save concurrently and clears only the settled lock", async () => {
    const first = deferred();
    const second = deferred();
    const other = makeStory({ objectID: "999" });
    mockedToggleBookmark.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result } = renderBookmarks();
    act(() => { result.current.toggle(sampleStory); result.current.toggle(other); });
    expect(mockedToggleBookmark).toHaveBeenCalledTimes(2);
    expect(result.current.pendingIds).toEqual([sampleStory.objectID, other.objectID]);
    expect(result.current.savedIds).toEqual([sampleStory.objectID, other.objectID]);
    await act(async () => first.resolve());
    expect(result.current.pendingIds).toEqual([other.objectID]);
    act(() => result.current.toggle(other));
    expect(mockedToggleBookmark).toHaveBeenCalledTimes(2);
    await act(async () => second.resolve());
    expect(result.current.pendingIds).toEqual([]);
  });

  it("keeps errors on one story when a different story succeeds", async () => {
    mockedToggleBookmark.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderBookmarks();
    await act(async () => result.current.toggle(sampleStory));
    const error = result.current.errors[sampleStory.objectID];
    await act(async () => result.current.toggle(makeStory({ objectID: "999" })));
    expect(result.current.errors[sampleStory.objectID]).toBe(error);
    expect(result.current.errors["999"]).toBeUndefined();
  });

  it("uses revalidated saved ids for the next operation after a request settles", async () => {
    const { result, rerender } = renderBookmarks();
    await act(async () => result.current.toggle(sampleStory));
    rerender({ ids: [sampleStory.objectID] });
    await act(async () => result.current.toggle(sampleStory));
    await waitFor(() => expect(mockedToggleBookmark).toHaveBeenNthCalledWith(2, sampleStory, true));
  });
  it("rolls back one failed story while another story remains pending and can retry independently", async () => {
    const first = deferred();
    const second = deferred();
    const retry = deferred();
    const other = makeStory({ objectID: "999" });
    mockedToggleBookmark.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockReturnValueOnce(retry.promise);
    const { result } = renderBookmarks();
    act(() => { result.current.toggle(sampleStory); result.current.toggle(other); });
    await act(async () => first.reject(new Error("offline")));
    expect(result.current.savedIds).toEqual([other.objectID]);
    expect(result.current.pendingIds).toEqual([other.objectID]);
    expect(result.current.errors[sampleStory.objectID]).toContain("previous saved state has been restored");
    act(() => result.current.toggle(sampleStory));
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(3, sampleStory, false);
    expect(result.current.errors[sampleStory.objectID]).toBeUndefined();
    expect(result.current.pendingIds).toEqual([other.objectID, sampleStory.objectID]);
    await act(async () => { second.resolve(); retry.resolve(); });
    expect(result.current.pendingIds).toEqual([]);
  });

  it.each([false, true])("retries the original operation after an ambiguous response and revalidation (saved=%s)", async (saved) => {
    mockedToggleBookmark.mockRejectedValueOnce(new Error("response lost"));
    const { result, rerender } = renderBookmarks(saved ? [sampleStory.objectID] : []);
    await act(async () => result.current.toggle(sampleStory));
    // The write committed despite the failed response. A later refresh reveals it.
    rerender({ ids: saved ? [] : [sampleStory.objectID] });
    await act(async () => result.current.retryFailed(sampleStory.objectID));
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(2, sampleStory, saved);
  });

  it("a fresh primary toggle follows the revalidated saved state after a lost response", async () => {
    mockedToggleBookmark.mockRejectedValueOnce(new Error("response lost"));
    const { result, rerender } = renderBookmarks();
    await act(async () => result.current.toggle(sampleStory));
    rerender({ ids: [sampleStory.objectID] });
    await act(async () => result.current.toggle(sampleStory));
    expect(mockedToggleBookmark).toHaveBeenNthCalledWith(2, sampleStory, true);
  });

  it("replays a pending save idempotently when revalidation confirms it before settlement", async () => {
    const pending = deferred();
    mockedToggleBookmark.mockReturnValue(pending.promise);
    const { result, rerender } = renderBookmarks();
    act(() => result.current.toggle(sampleStory));
    rerender({ ids: [sampleStory.objectID, "other"] });
    expect(result.current.savedIds.filter((id) => id === sampleStory.objectID)).toHaveLength(1);
    expect(result.current.savedIds).toContain("other");
    await act(async () => pending.resolve());
    expect(result.current.savedIds).toEqual([sampleStory.objectID, "other"]);
  });

  it("ignores retry requests for unknown stories without clearing another story's failure", async () => {
    mockedToggleBookmark.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderBookmarks();
    await act(async () => result.current.toggle(sampleStory));
    const error = result.current.errors[sampleStory.objectID];
    act(() => result.current.retryFailed("unknown-story"));
    expect(mockedToggleBookmark).toHaveBeenCalledTimes(1);
    expect(result.current.pendingIds).toEqual([]);
    expect(result.current.errors[sampleStory.objectID]).toBe(error);
    expect(result.current.savedIds).toEqual([]);
  });

});
