import { describe, expect, it } from "vitest";
import {
  readSearchParams,
  sameSearchParams,
  searchParamsFromRecord,
  toSearchUrl,
} from "@/lib/search/params";

const base = { query: "tokyo", storyType: "job", dateRange: "week", sortBy: "points", page: 2 } as const;

describe("search params helpers", () => {
  it("reads every param and falls back to defaults", () => {
    expect(readSearchParams(new URLSearchParams("query=tokyo&storyType=job&dateRange=week&sortBy=points&page=2"))).toEqual(base);
    expect(readSearchParams(new URLSearchParams())).toEqual({
      query: "",
      storyType: "all",
      dateRange: "all",
      sortBy: "date_desc",
      page: 0,
    });
  });

  it.each(["-1", "NaN"])("normalizes page=%s to the first page", (page) => {
    expect(readSearchParams(new URLSearchParams(`page=${page}`)).page).toBe(0);
  });

  it("converts an App Router searchParams record, first value wins", () => {
    const params = searchParamsFromRecord({ query: ["kyoto", "osaka"], page: "1", storyType: undefined });
    expect(params.get("query")).toBe("kyoto");
    expect(params.get("page")).toBe("1");
    expect(params.has("storyType")).toBe(false);
  });

  it("builds URLs and compares params", () => {
    expect(toSearchUrl(base)).toBe("/?query=tokyo&storyType=job&dateRange=week&sortBy=points&page=2");
    expect(sameSearchParams(base, { ...base })).toBe(true);
    expect(sameSearchParams(base, { ...base, page: 3 })).toBe(false);
  });

  it("reports a difference for every compared field", () => {
    expect(sameSearchParams(base, { ...base, query: "osaka" })).toBe(false);
    expect(sameSearchParams(base, { ...base, storyType: "all" })).toBe(false);
    expect(sameSearchParams(base, { ...base, dateRange: "all" })).toBe(false);
    expect(sameSearchParams(base, { ...base, sortBy: "date_desc" })).toBe(false);
  });
});
