import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAlgoliaURL,
  fetchFromAlgolia,
  getUnixTimestamp,
  sortHitsByStrategy,
} from "@/lib/algolia";
import { HITS_PER_PAGE } from "@/lib/constants";
import type { HNStory } from "@/lib/types";

const NOW_MS = 1_700_000_000_000;

function makeStory(overrides: Partial<HNStory>): HNStory {
  return {
    objectID: "1",
    title: "A story",
    url: null,
    author: "alice",
    points: 0,
    num_comments: 0,
    created_at: "2024-01-01T00:00:00.000Z",
    created_at_i: 0,
    _tags: ["story"],
    story_id: 1,
    ...overrides,
  };
}

describe("getUnixTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("subtracts the correct window for each range", () => {
    const nowSeconds = NOW_MS / 1000;
    expect(getUnixTimestamp("24h")).toBe(Math.floor(nowSeconds - 86400));
    expect(getUnixTimestamp("week")).toBe(Math.floor(nowSeconds - 604800));
    expect(getUnixTimestamp("month")).toBe(Math.floor(nowSeconds - 2592000));
    expect(getUnixTimestamp("year")).toBe(Math.floor(nowSeconds - 31536000));
  });

  it("returns null for the all-time range", () => {
    expect(getUnixTimestamp("all")).toBeNull();
  });
});

describe("buildAlgoliaURL", () => {
  it("prepends Japan to the user query", () => {
    const url = new URL(buildAlgoliaURL("tokyo", "all", "all", "relevance", 0));
    expect(url.searchParams.get("query")).toBe("Japan tokyo");
  });

  it("defaults to Japan when the query is empty", () => {
    const url = new URL(buildAlgoliaURL("", "all", "all", "relevance", 0));
    expect(url.searchParams.get("query")).toBe("Japan");
  });

  it("uses search_by_date only for date_desc sorting", () => {
    expect(buildAlgoliaURL("", "all", "all", "date_desc", 0)).toContain(
      "/search_by_date?"
    );
    for (const sort of ["relevance", "date_asc", "points", "comments"] as const) {
      expect(buildAlgoliaURL("", "all", "all", sort, 0)).toContain("/search?");
    }
  });

  it("adds advancedSyntax for date_desc but not other sorts", () => {
    const dateDesc = new URL(buildAlgoliaURL("", "all", "all", "date_desc", 0));
    expect(dateDesc.searchParams.get("advancedSyntax")).toBe("true");

    const relevance = new URL(buildAlgoliaURL("", "all", "all", "relevance", 0));
    expect(relevance.searchParams.has("advancedSyntax")).toBe(false);
  });

  it("filters by a specific story type tag", () => {
    const url = new URL(buildAlgoliaURL("", "show_hn", "all", "relevance", 0));
    expect(url.searchParams.get("tags")).toBe("show_hn");
  });

  it("excludes comments via a tag union when story type is all", () => {
    const url = new URL(buildAlgoliaURL("", "all", "all", "relevance", 0));
    expect(url.searchParams.get("tags")).toBe("(story,ask_hn,show_hn,job)");
  });

  it("adds a numeric created_at filter for bounded date ranges only", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW_MS);
    try {
      const bounded = new URL(buildAlgoliaURL("", "all", "week", "relevance", 0));
      expect(bounded.searchParams.get("numericFilters")).toBe(
        `created_at_i>${Math.floor(NOW_MS / 1000 - 604800)}`
      );

      const unbounded = new URL(buildAlgoliaURL("", "all", "all", "relevance", 0));
      expect(unbounded.searchParams.has("numericFilters")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("includes the requested page and hitsPerPage", () => {
    const url = new URL(buildAlgoliaURL("", "all", "all", "relevance", 4));
    expect(url.searchParams.get("page")).toBe("4");
    expect(url.searchParams.get("hitsPerPage")).toBe(String(HITS_PER_PAGE));
  });
});

describe("fetchFromAlgolia", () => {
  it("returns parsed JSON and sends the identifying User-Agent", async () => {
    const payload = { hits: [], nbHits: 0, nbPages: 0, page: 0, hitsPerPage: 30, query: "Japan" };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(payload),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchFromAlgolia("https://hn.algolia.com/api/v1/search?query=Japan");

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://hn.algolia.com/api/v1/search?query=Japan",
      { headers: { "User-Agent": "HN-Japan-Dashboard/1.0" } }
    );
  });

  it("throws with the HTTP status when the response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503, json: vi.fn() })
    );

    await expect(fetchFromAlgolia("https://example.com")).rejects.toThrow(
      "Algolia API error: 503"
    );
  });

  it("propagates network failures from fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    await expect(fetchFromAlgolia("https://example.com")).rejects.toThrow(
      "network down"
    );
  });
});

describe("sortHitsByStrategy", () => {
  const hits = [
    makeStory({ objectID: "a", points: 5, num_comments: 30, created_at_i: 300 }),
    makeStory({ objectID: "b", points: null, num_comments: null, created_at_i: 100 }),
    makeStory({ objectID: "c", points: 50, num_comments: 10, created_at_i: 200 }),
  ];

  it("sorts by points descending, treating null as zero", () => {
    const sorted = sortHitsByStrategy(hits, "points");
    expect(sorted.map((h) => h.objectID)).toEqual(["c", "a", "b"]);
  });

  it("sorts by comment count descending, treating null as zero", () => {
    const sorted = sortHitsByStrategy(hits, "comments");
    expect(sorted.map((h) => h.objectID)).toEqual(["a", "c", "b"]);
  });

  it("sorts by creation time ascending for date_asc", () => {
    const sorted = sortHitsByStrategy(hits, "date_asc");
    expect(sorted.map((h) => h.objectID)).toEqual(["b", "c", "a"]);
  });

  it("preserves API order for relevance and date_desc", () => {
    expect(sortHitsByStrategy(hits, "relevance").map((h) => h.objectID)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(sortHitsByStrategy(hits, "date_desc").map((h) => h.objectID)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [...hits];
    sortHitsByStrategy(input, "points");
    expect(input.map((h) => h.objectID)).toEqual(["a", "b", "c"]);
  });
});
