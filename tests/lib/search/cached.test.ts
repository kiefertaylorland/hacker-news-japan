import { describe, expect, it, vi } from "vitest";
import { cacheLife } from "next/cache";
import { getCachedStories } from "@/lib/search/cached";
import { searchStories } from "@/lib/search/api";
import { makeResults } from "../../fixtures/stories";

vi.mock("next/cache", () => import("../../helpers/mockNext").then((m) => m.cacheMock()));
vi.mock("@/lib/search/api", () => ({ searchStories: vi.fn() }));

const params = { query: "", storyType: "all", dateRange: "all", sortBy: "date_desc", page: 0 } as const;

describe("getCachedStories", () => {
  it("delegates to searchStories with a minutes cache life", async () => {
    const results = makeResults();
    vi.mocked(searchStories).mockResolvedValue(results);
    await expect(getCachedStories(params)).resolves.toBe(results);
    expect(searchStories).toHaveBeenCalledWith(params);
    expect(cacheLife).toHaveBeenCalledWith("minutes");
  });

  it("propagates failures so they are not cached", async () => {
    vi.mocked(searchStories).mockRejectedValue(new Error("Algolia API error: 500"));
    await expect(getCachedStories(params)).rejects.toThrow("Algolia API error: 500");
  });
});
