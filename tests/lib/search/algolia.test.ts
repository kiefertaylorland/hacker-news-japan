import { describe, expect, it, vi } from "vitest";
import {
  buildAlgoliaURL,
  fetchFromAlgolia,
  getUnixTimestamp,
  sortHitsByStrategy,
} from "@/lib/search/algolia";
import { HITS_PER_PAGE } from "@/lib/constants";
import type { SortBy } from "@/lib/types";
import { makeStory } from "../../fixtures/stories";

const NOW_MS = 1_700_000_000_000;
const NOW_S = NOW_MS / 1000;

const payload = { hits: [], nbHits: 0, nbPages: 0, page: 0, hitsPerPage: 30, query: "Japan" };
const USER_AGENT = { headers: { "User-Agent": "HN-Japan-Dashboard/1.0" } };

function stubFetch(response: Record<string, unknown>) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("getUnixTimestamp", () => {
  it.each([
    ["24h", 86400],
    ["week", 604800],
    ["month", 2592000],
    ["year", 31536000],
  ] as const)("subtracts the %s window", (range, seconds) => {
    vi.spyOn(Date, "now").mockReturnValue(NOW_MS);
    expect(getUnixTimestamp(range)).toBe(Math.floor(NOW_S - seconds));
  });

  it("returns null for the all-time range and unknown values", () => {
    expect(getUnixTimestamp("all")).toBeNull();
    expect(getUnixTimestamp("unexpected" as never)).toBeNull();
  });
});

describe("buildAlgoliaURL", () => {
  it("builds the newest-first default search", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW_MS);
    const url = new URL(buildAlgoliaURL("", "all", "all", "date_desc", 2));
    expect(url.pathname).toBe("/api/v1/search_by_date");
    expect(url.searchParams.get("query")).toBe("Japan");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("hitsPerPage")).toBe(String(HITS_PER_PAGE));
    expect(url.searchParams.get("tags")).toBe("(story,ask_hn,show_hn,job)");
    expect(url.searchParams.get("advancedSyntax")).toBe("true");
    expect(url.searchParams.has("numericFilters")).toBe(false);
  });

  it("builds a filtered relevance search", () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW_MS);
    const url = new URL(buildAlgoliaURL("economy", "job", "24h", "points", 1));
    expect(url.pathname).toBe("/api/v1/search");
    expect(url.searchParams.get("query")).toBe("Japan economy");
    expect(url.searchParams.get("tags")).toBe("job");
    expect(url.searchParams.get("numericFilters")).toBe(`created_at_i>${Math.floor(NOW_S - 86400)}`);
    expect(url.searchParams.has("advancedSyntax")).toBe(false);
  });

  it("uses search_by_date only for date_desc sorting", () => {
    expect(buildAlgoliaURL("", "all", "all", "date_desc", 0)).toContain("/search_by_date?");
    for (const sort of ["relevance", "date_asc", "points", "comments"] as const) {
      expect(buildAlgoliaURL("", "all", "all", sort, 0)).toContain("/search?");
    }
  });

  it("filters by a specific story type tag", () => {
    const url = new URL(buildAlgoliaURL("", "show_hn", "all", "relevance", 0));
    expect(url.searchParams.get("tags")).toBe("show_hn");
  });
});

describe("fetchFromAlgolia", () => {
  const url = "https://hn.algolia.com/api/v1/search?query=Japan";

  it("returns parsed JSON in browser context", async () => {
    const fetchMock = stubFetch({ ok: true, json: () => Promise.resolve(payload) });
    await expect(fetchFromAlgolia(url)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(url, undefined);
  });

  it("sends the identifying User-Agent outside browsers", async () => {
    vi.stubGlobal("window", undefined);
    const fetchMock = stubFetch({ ok: true, json: () => Promise.resolve(payload) });
    await expect(fetchFromAlgolia(url)).resolves.toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(url, USER_AGENT);
  });

  it.each(["browser", "server"] as const)(
    "forwards the abort signal in %s context without changing headers",
    async (context) => {
      if (context === "server") vi.stubGlobal("window", undefined);
      const controller = new AbortController();
      const abortError = new DOMException("Aborted", "AbortError");
      const fetchMock = vi.fn().mockImplementation((_url, options: RequestInit) =>
        new Promise((_resolve, reject) => {
          options.signal!.addEventListener("abort", () => reject(abortError));
        })
      );
      vi.stubGlobal("fetch", fetchMock);

      const pending = fetchFromAlgolia("https://example.com", controller.signal);
      expect(fetchMock).toHaveBeenCalledWith("https://example.com", {
        signal: controller.signal,
        ...(context === "server" ? USER_AGENT : {}),
      });
      controller.abort();
      await expect(pending).rejects.toBe(abortError);
    }
  );

  it("throws with the HTTP status when the response is not ok", async () => {
    stubFetch({ ok: false, status: 503, json: vi.fn() });
    await expect(fetchFromAlgolia(url)).rejects.toThrow("Algolia API error: 503");
  });

  it("propagates network failures from fetch", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    await expect(fetchFromAlgolia(url)).rejects.toThrow("network down");
  });
});

describe("sortHitsByStrategy", () => {
  const hits = [
    makeStory({ objectID: "a", points: 5, num_comments: 30, created_at_i: 300 }),
    makeStory({ objectID: "b", points: null, num_comments: null, created_at_i: 100 }),
    makeStory({ objectID: "c", points: 50, num_comments: 10, created_at_i: 200 }),
  ];
  const ids = (sorted: typeof hits) => sorted.map((h) => h.objectID);

  it.each([
    ["points", ["c", "a", "b"]],
    ["comments", ["a", "c", "b"]],
    ["date_asc", ["b", "c", "a"]],
    ["relevance", ["a", "b", "c"]],
    ["date_desc", ["a", "b", "c"]],
    ["fallback", ["a", "b", "c"]],
  ] satisfies [SortBy | "fallback", string[]][])("sorts hits by %s (null as zero)", (sortBy, order) => {
    const sorted = sortHitsByStrategy(hits, sortBy as SortBy);
    expect(ids(sorted)).toEqual(order);
    expect(sorted).not.toBe(hits);
  });

  it("orders null points and comments last regardless of input order", () => {
    const reversed = [hits[0], hits[2], hits[1]];
    expect(ids(sortHitsByStrategy(reversed, "points"))).toEqual(["c", "a", "b"]);
    expect(ids(sortHitsByStrategy(reversed, "comments"))).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the input array", () => {
    const input = [...hits];
    sortHitsByStrategy(input, "points");
    expect(ids(input)).toEqual(["a", "b", "c"]);
  });
});
