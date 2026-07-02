import { describe, expect, it, vi } from "vitest";
import * as algolia from "@/lib/algolia";
import { searchStories } from "@/lib/api";
import {
  DATE_RANGE_OPTIONS,
  DEFAULT_SEARCH_PARAMS,
  SORT_BY_OPTIONS,
  STORY_TYPE_OPTIONS,
} from "@/lib/constants";
import {
  buildAlgoliaURL,
  fetchFromAlgolia,
  getUnixTimestamp,
  sortHitsByStrategy,
} from "@/lib/algolia";
import { cn, formatRelativeTime, getDomain } from "@/lib/utils";
import type { AlgoliaResponse, HNStory, SortBy } from "@/lib/types";

const sampleHits: HNStory[] = [
  {
    objectID: "1",
    title: "First",
    url: "https://example.com/first",
    author: "alice",
    points: 10,
    num_comments: 2,
    created_at: "2024-01-02T00:00:00.000Z",
    created_at_i: 200,
    _tags: ["story"],
    story_id: 1,
  },
  {
    objectID: "2",
    title: "Second",
    url: "https://www.example.com/second",
    author: "bob",
    points: 25,
    num_comments: 9,
    created_at: "2024-01-01T00:00:00.000Z",
    created_at_i: 100,
    _tags: ["job"],
    story_id: 2,
  },
];

describe("lib utilities and API helpers", () => {
  it("covers constants and utility helpers", () => {
    expect(STORY_TYPE_OPTIONS.map((option) => option.value)).toEqual([
      "all",
      "story",
      "ask_hn",
      "show_hn",
      "job",
    ]);
    expect(DATE_RANGE_OPTIONS).toHaveLength(5);
    expect(SORT_BY_OPTIONS).toHaveLength(5);
    expect(DEFAULT_SEARCH_PARAMS).toEqual({
      query: "",
      storyType: "all",
      dateRange: "all",
      sortBy: "date_desc",
      page: 0,
    });

    expect(cn("alpha", ["beta"], { gamma: true, delta: false })).toBe("alpha beta gamma");
    expect(formatRelativeTime("2020-01-01T00:00:00.000Z")).not.toBe("unknown");
    expect(formatRelativeTime("not-a-date")).toBe("unknown");
    expect(getDomain("https://www.example.com/path")).toBe("example.com");
    expect(getDomain(null)).toBe("");
    expect(getDomain("notaurl")).toBe("");
  });

  it("returns timestamps for each date range", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    expect(getUnixTimestamp("24h")).toBe(1_699_913_600);
    expect(getUnixTimestamp("week")).toBe(1_699_395_200);
    expect(getUnixTimestamp("month")).toBe(1_697_408_000);
    expect(getUnixTimestamp("year")).toBe(1_668_464_000);
    expect(getUnixTimestamp("all")).toBeNull();
    expect(getUnixTimestamp("unexpected" as never)).toBeNull();
  });

  it("builds Algolia URLs for default and filtered searches", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const newestUrl = new URL(buildAlgoliaURL("", "all", "all", "date_desc", 2));
    expect(newestUrl.pathname).toBe("/api/v1/search_by_date");
    expect(newestUrl.searchParams.get("query")).toBe("Japan");
    expect(newestUrl.searchParams.get("page")).toBe("2");
    expect(newestUrl.searchParams.get("hitsPerPage")).toBe("30");
    expect(newestUrl.searchParams.get("tags")).toBe("(story,ask_hn,show_hn,job)");
    expect(newestUrl.searchParams.get("advancedSyntax")).toBe("true");
    expect(newestUrl.searchParams.has("numericFilters")).toBe(false);

    const filteredUrl = new URL(buildAlgoliaURL("economy", "job", "24h", "points", 1));
    expect(filteredUrl.pathname).toBe("/api/v1/search");
    expect(filteredUrl.searchParams.get("query")).toBe("Japan economy");
    expect(filteredUrl.searchParams.get("tags")).toBe("job");
    expect(filteredUrl.searchParams.get("numericFilters")).toBe("created_at_i>1699913600");
    expect(filteredUrl.searchParams.has("advancedSyntax")).toBe(false);
  });

  it("fetches Algolia responses and throws on failed responses", async () => {
    const json = vi.fn().mockResolvedValue({ hits: sampleHits, nbHits: 2 });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json,
      })
    );

    await expect(fetchFromAlgolia("https://example.com/search")).resolves.toEqual({
      hits: sampleHits,
      nbHits: 2,
    });
    expect(fetch).toHaveBeenCalledWith("https://example.com/search", undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      })
    );

    await expect(fetchFromAlgolia("https://example.com/search")).rejects.toThrow(
      "Algolia API error: 503"
    );
  });

  it.each([
    ["points", ["2", "1"]],
    ["comments", ["2", "1"]],
    ["date_asc", ["2", "1"]],
    ["relevance", ["1", "2"]],
    ["date_desc", ["1", "2"]],
    ["fallback", ["1", "2"]],
  ] satisfies [SortBy | "fallback", string[]][])(
    "sorts hits by %s",
    (sortBy, order) => {
      const sorted = sortHitsByStrategy(sampleHits, sortBy as SortBy);
      expect(sorted.map((hit) => hit.objectID)).toEqual(order);
      expect(sorted).not.toBe(sampleHits);
    }
  );

  it("sorts null point and comment values as zero", () => {
    const nullableHits: HNStory[] = [
      {
        ...sampleHits[0],
        objectID: "3",
        points: null,
        num_comments: null,
      },
      sampleHits[1],
    ];

    expect(sortHitsByStrategy(nullableHits, "points").map((hit) => hit.objectID)).toEqual([
      "2",
      "3",
    ]);
    expect(sortHitsByStrategy(nullableHits, "comments").map((hit) => hit.objectID)).toEqual([
      "2",
      "3",
    ]);

    const reversedNullableHits = [sampleHits[1], nullableHits[0]];
    expect(sortHitsByStrategy(reversedNullableHits, "points").map((hit) => hit.objectID)).toEqual([
      "2",
      "3",
    ]);
    expect(
      sortHitsByStrategy(reversedNullableHits, "comments").map((hit) => hit.objectID)
    ).toEqual(["2", "3"]);
  });

  it.each(["points", "comments", "date_asc"] satisfies SortBy[])(
    "applies client-side sorting for %s searches",
    async (sortBy) => {
      const buildSpy = vi.spyOn(algolia, "buildAlgoliaURL").mockReturnValue("https://algolia.test");
      const fetchSpy = vi.spyOn(algolia, "fetchFromAlgolia").mockResolvedValue({
        hits: sampleHits,
        nbHits: 2,
        nbPages: 1,
        page: 0,
        hitsPerPage: 30,
        query: "Japan",
      } satisfies AlgoliaResponse);
      const sortSpy = vi
        .spyOn(algolia, "sortHitsByStrategy")
        .mockReturnValue([...sampleHits].reverse());

      const result = await searchStories({
        query: "Japan",
        storyType: "all",
        dateRange: "all",
        sortBy,
        page: 0,
      });

      expect(buildSpy).toHaveBeenCalledWith("Japan", "all", "all", sortBy, 0);
      expect(fetchSpy).toHaveBeenCalledWith("https://algolia.test");
      expect(sortSpy).toHaveBeenCalledWith(sampleHits, sortBy);
      expect(result.hits.map((hit) => hit.objectID)).toEqual(["2", "1"]);
    }
  );

  it.each(["relevance", "date_desc"] satisfies SortBy[])(
    "does not apply client-side sorting for %s searches",
    async (sortBy) => {
      vi.spyOn(algolia, "buildAlgoliaURL").mockReturnValue("https://algolia.test");
      vi.spyOn(algolia, "fetchFromAlgolia").mockResolvedValue({
        hits: sampleHits,
        nbHits: 2,
        nbPages: 1,
        page: 0,
        hitsPerPage: 30,
        query: "Japan",
      } satisfies AlgoliaResponse);
      const sortSpy = vi.spyOn(algolia, "sortHitsByStrategy");

      const result = await searchStories({
        query: "",
        storyType: "story",
        dateRange: "week",
        sortBy,
        page: 3,
      });

      expect(sortSpy).not.toHaveBeenCalled();
      expect(result.hits).toEqual(sampleHits);
    }
  );
});
