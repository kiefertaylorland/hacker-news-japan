import { describe, expect, it } from "vitest";
import {
  DATE_RANGE_OPTIONS,
  DEFAULT_SEARCH_PARAMS,
  SORT_BY_OPTIONS,
  STORY_TYPE_OPTIONS,
} from "@/lib/constants";
import { cn, formatRelativeTime } from "@/lib/utils";

describe("constants", () => {
  it("exposes the option lists and default search params", () => {
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
  });
});

describe("utils", () => {
  it("merges class names", () => {
    expect(cn("alpha", ["beta"], { gamma: true, delta: false })).toBe("alpha beta gamma");
  });

  it("formats relative times and tolerates bad input", () => {
    expect(formatRelativeTime("2020-01-01T00:00:00.000Z")).not.toBe("unknown");
    expect(formatRelativeTime("not-a-date")).toBe("unknown");
  });
});
