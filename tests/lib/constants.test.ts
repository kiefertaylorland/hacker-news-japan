import { describe, expect, it } from "vitest";
import { DATE_RANGE_OPTIONS, SORT_BY_OPTIONS, STORY_TYPE_OPTIONS } from "@/lib/constants";

describe("constants", () => {
  it("defines every story type option", () => {
    expect(STORY_TYPE_OPTIONS).toEqual([
      { label: "All Stories", value: "all" },
      { label: "Stories", value: "story" },
      { label: "Ask HN", value: "ask_hn" },
      { label: "Show HN", value: "show_hn" },
      { label: "Jobs", value: "job" },
    ]);
  });

  it("defines every date range option", () => {
    expect(DATE_RANGE_OPTIONS).toEqual([
      { label: "Past 24h", value: "24h" },
      { label: "Past Week", value: "week" },
      { label: "Past Month", value: "month" },
      { label: "Past Year", value: "year" },
      { label: "All Time", value: "all" },
    ]);
  });

  it("defines every sort option", () => {
    expect(SORT_BY_OPTIONS).toEqual([
      { label: "Relevance", value: "relevance" },
      { label: "Newest", value: "date_desc" },
      { label: "Oldest", value: "date_asc" },
      { label: "Points", value: "points" },
      { label: "Comments", value: "comments" },
    ]);
  });
});
