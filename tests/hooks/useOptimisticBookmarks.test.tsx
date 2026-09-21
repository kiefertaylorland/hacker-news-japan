import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOptimisticBookmarks } from "@/hooks/useOptimisticBookmarks";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import { sampleStory } from "../fixtures/stories";

vi.mock("@/lib/bookmarks/actions", () => ({
  toggleBookmark: vi.fn(),
}));

const mockedToggleBookmark = vi.mocked(toggleBookmark);

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
});
