import { describe, expect, it } from "vitest";
import { DATE_RANGE_OPTIONS, SORT_BY_OPTIONS, STORY_TYPE_OPTIONS } from "@/lib/constants";

describe("constants", () => {
  it.each([
    {
      group: "story type",
      options: STORY_TYPE_OPTIONS,
      expected: [
        ["All Stories", "all"],
        ["Stories", "story"],
        ["Ask HN", "ask_hn"],
        ["Show HN", "show_hn"],
        ["Jobs", "job"],
      ],
    },
    {
      group: "date range",
      options: DATE_RANGE_OPTIONS,
      expected: [
        ["Past 24h", "24h"],
        ["Past Week", "week"],
        ["Past Month", "month"],
        ["Past Year", "year"],
        ["All Time", "all"],
      ],
    },
    {
      group: "sort",
      options: SORT_BY_OPTIONS,
      expected: [
        ["Relevance", "relevance"],
        ["Newest", "date_desc"],
        ["Oldest", "date_asc"],
        ["Points", "points"],
        ["Comments", "comments"],
      ],
    },
  ])("defines every $group option", ({ options, expected }) => {
    expect(options).toEqual(expected.map(([label, value]) => ({ label, value })));
  });
});
