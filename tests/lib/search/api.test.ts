import { describe, expect, it, vi } from "vitest";
import * as algolia from "@/lib/search/algolia";
import { searchStories } from "@/lib/search/api";
import { DEFAULT_SEARCH_PARAMS, HITS_PER_PAGE } from "@/lib/constants";
import type { SortBy } from "@/lib/types";
import { makeResults, makeStory } from "../../fixtures/stories";

const sampleHits = [makeStory({ objectID: "1" }), makeStory({ objectID: "2" })];

function spyOnAlgolia() {
  const buildSpy = vi.spyOn(algolia, "buildAlgoliaURL").mockReturnValue("https://algolia.test");
  const fetchSpy = vi.spyOn(algolia, "fetchFromAlgolia").mockResolvedValue(makeResults({ hits: sampleHits, nbHits: 2, nbPages: 1 }));
  const sortSpy = vi.spyOn(algolia, "sortHitsByStrategy");
  return { buildSpy, fetchSpy, sortSpy };
}

describe("searchStories", () => {
  it.each(["points", "comments", "date_asc"] satisfies SortBy[])(
    "applies client-side sorting for %s searches",
    async (sortBy) => {
      const { buildSpy, fetchSpy, sortSpy } = spyOnAlgolia();
      sortSpy.mockReturnValue([...sampleHits].reverse());

      const result = await searchStories({ ...DEFAULT_SEARCH_PARAMS, query: "Japan", sortBy });

      expect(buildSpy).toHaveBeenCalledWith({ ...DEFAULT_SEARCH_PARAMS, query: "Japan", sortBy });
      expect(fetchSpy).toHaveBeenCalledWith("https://algolia.test", undefined);
      expect(sortSpy).toHaveBeenCalledWith(sampleHits, sortBy);
      expect(result.hits.map((hit) => hit.objectID)).toEqual(["2", "1"]);
    }
  );

  it("pages through the sorted window locally for client-side sorts", async () => {
    const window = Array.from({ length: 65 }, (_, i) => makeStory({ objectID: String(i), points: i }));
    vi.spyOn(algolia, "buildAlgoliaURL").mockReturnValue("https://algolia.test");
    vi.spyOn(algolia, "fetchFromAlgolia").mockResolvedValue(
      makeResults({ hits: window, nbHits: 19692, nbPages: 1, page: 0, hitsPerPage: 300 })
    );

    const page1 = await searchStories({ ...DEFAULT_SEARCH_PARAMS, sortBy: "points", page: 1 });
    expect(page1.hits.map((hit) => hit.points)).toEqual(
      Array.from({ length: HITS_PER_PAGE }, (_, i) => 64 - HITS_PER_PAGE - i)
    );
    expect(page1).toMatchObject({ nbHits: 65, nbPages: 3, page: 1, hitsPerPage: HITS_PER_PAGE });

    const page2 = await searchStories({ ...DEFAULT_SEARCH_PARAMS, sortBy: "points", page: 2 });
    expect(page2.hits.map((hit) => hit.points)).toEqual([4, 3, 2, 1, 0]);

    const beyond = await searchStories({ ...DEFAULT_SEARCH_PARAMS, sortBy: "points", page: 3 });
    expect(beyond.hits).toEqual([]);
  });

  it.each(["relevance", "date_desc"] satisfies SortBy[])(
    "does not apply client-side sorting for %s searches",
    async (sortBy) => {
      const { sortSpy } = spyOnAlgolia();

      const result = await searchStories({ query: "", storyType: "story", dateRange: "week", sortBy, page: 3 });

      expect(sortSpy).not.toHaveBeenCalled();
      expect(result.hits).toEqual(sampleHits);
    }
  );

  it("forwards cancellation to Algolia and propagates abort failures", async () => {
    const controller = new AbortController();
    const abortError = new DOMException("Aborted", "AbortError");
    const fetchSpy = vi.spyOn(algolia, "fetchFromAlgolia").mockRejectedValue(abortError);

    await expect(searchStories(DEFAULT_SEARCH_PARAMS, controller.signal)).rejects.toBe(abortError);
    expect(fetchSpy).toHaveBeenCalledWith(
      algolia.buildAlgoliaURL(DEFAULT_SEARCH_PARAMS),
      controller.signal
    );
  });
});
