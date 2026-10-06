import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRecommendedStories } from "@/lib/recommendations/stories";
import { getCachedStories } from "@/lib/search/cached";
import { makeStory, makeResults } from "../../fixtures/stories";

vi.mock("@/lib/search/cached", () => ({ getCachedStories: vi.fn() }));
const search = vi.mocked(getCachedStories);

beforeEach(() => {
  search.mockReset();
});

describe("getRecommendedStories", () => {
  it("skips searching without meaningful saved topics", async () => {
    expect(await getRecommendedStories([])).toEqual([]);
    expect(await getRecommendedStories([makeStory({ title: "Ask HN: JAPAN and the new X 2026" })])).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it("uses the three most frequent topics from the twenty newest bookmarks", async () => {
    search.mockResolvedValue(makeResults({ hits: [] }));
    const saved = [
      makeStory({ title: "Japan sushi SUSHI trains 東京" }),
      makeStory({ title: "Trains and sushi" }),
      ...Array.from({ length: 18 }, () => makeStory({ title: "Robotics in Japan" })),
      makeStory({ title: "Ignored ignored ignored" }),
    ];
    expect(await getRecommendedStories(saved)).toEqual([]);
    expect(search.mock.calls.map(([params]) => params.query)).toEqual(["robotics", "sushi", "trains"]);
    expect(search).toHaveBeenCalledWith({ query: "robotics", storyType: "story", dateRange: "all", sortBy: "relevance", page: 0 });
  });

  it("ranks title matches by saved-topic frequency, then recency, excluding saved and duplicate posts", async () => {
    const saved = [makeStory({ title: "Rust rust trains" }), makeStory({ objectID: "999", title: "Rust" })];
    const related = makeStory({ objectID: "1", title: "Rust trains in Japan", created_at_i: 1 });
    const recent = makeStory({ objectID: "2", title: "Rust in Japan", created_at_i: 20 });
    const older = makeStory({ objectID: "3", title: "Rust in Japan", created_at_i: 10 });
    const weak = makeStory({ objectID: "4", title: "Trains in Japan", created_at_i: 100 });
    search.mockResolvedValue(makeResults({ hits: [saved[0], saved[1], weak, older, related, recent, related, makeStory({ objectID: "5", title: "Unrelated" })] }));
    expect(await getRecommendedStories(saved)).toEqual([related, recent, older, weak]);
  });

  it("limits suggestions to twelve posts", async () => {
    const hits = Array.from({ length: 15 }, (_, i) => makeStory({ objectID: String(i), title: "Sushi", created_at_i: i }));
    search.mockResolvedValue(makeResults({ hits }));
    expect(await getRecommendedStories([makeStory({ title: "Sushi" })])).toEqual([...hits].reverse().slice(0, 12));
  });

  it("uses only twenty bookmarks for topics but excludes older saved posts too", async () => {
    const older = makeStory({ objectID: "older", title: "Sushi legacy" });
    const saved = [
      ...Array.from({ length: 19 }, (_, i) => makeStory({ objectID: `saved-${i}`, title: "Sushi" })),
      makeStory({ title: "Trains" }),
      older,
    ];
    const suggestion = makeStory({ objectID: "suggestion", title: "Sushi" });
    search.mockResolvedValue(makeResults({ hits: [older, suggestion] }));
    expect(await getRecommendedStories(saved)).toEqual([suggestion]);
    expect(search.mock.calls.map(([params]) => params.query)).toEqual(["sushi", "trains"]);
  });

  it("preserves technical topics containing digits while discarding standalone numbers", async () => {
    search.mockResolvedValue(makeResults({ hits: [] }));
    await getRecommendedStories([makeStory({ title: "Japan: x86 / 3D / 2026" })]);
    expect(search.mock.calls.map(([params]) => params.query)).toEqual(["x86", "3d"]);
  });

  it("keeps interests separate between requests and handles unicode topics", async () => {
    const sushi = makeStory({ objectID: "1", title: "Sushi" });
    const robotics = makeStory({ objectID: "2", title: "Robotics" });
    const tokyo = makeStory({ objectID: "3", title: "東京 AI" });
    search.mockResolvedValue(makeResults({ hits: [sushi, robotics, tokyo] }));
    expect(await getRecommendedStories([makeStory({ title: "Sushi" })])).toEqual([sushi]);
    expect(await getRecommendedStories([makeStory({ title: "Robotics" })])).toEqual([robotics]);
    expect(await getRecommendedStories([makeStory({ title: "東京" })])).toEqual([tokyo]);
    expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ query: "東京" }));
    expect(await getRecommendedStories([makeStory({ title: "AI in Japan" })])).toEqual([tokyo]);
    expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ query: "ai" }));
  });

  it("propagates Algolia failures for the page's recoverable error state", async () => {
    search.mockRejectedValue(new Error("Algolia unavailable"));
    await expect(getRecommendedStories([makeStory({ title: "Sushi" })])).rejects.toThrow("Could not load recommendations");
  });

  it("keeps successful recommendations when another topic search fails", async () => {
    const suggestion = makeStory({ objectID: "456", title: "Sushi in Japan" });
    search.mockResolvedValueOnce(makeResults({ hits: [suggestion] })).mockRejectedValueOnce(new Error("upstream down"));
    expect(await getRecommendedStories([makeStory({ title: "Sushi trains" })])).toEqual([suggestion]);
    expect(search).toHaveBeenCalledTimes(2);
  });

  it("bounds title processing and outgoing queries for client-supplied bookmarks", async () => {
    search.mockResolvedValue(makeResults({ hits: [] }));
    await getRecommendedStories([makeStory({ title: "x".repeat(301) })]);
    expect(search).toHaveBeenLastCalledWith(expect.objectContaining({ query: "x".repeat(300) }));
    search.mockClear();
    expect(await getRecommendedStories([makeStory({ title: " ".repeat(300) + "Sushi" })])).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });
});
