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
    expect(searchStories).toHaveBeenCalledWith(params, expect.any(AbortSignal));
    expect(cacheLife).toHaveBeenCalledWith("minutes");
  });

  it("aborts stalled upstream requests after ten seconds", async () => {
    const controller = new AbortController();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    vi.mocked(searchStories).mockImplementation((_params, signal) => new Promise((_resolve, reject) => {
      signal?.addEventListener("abort", () => reject(signal.reason), { once: true });
    }));
    const result = getCachedStories(params);
    const rejected = expect(result).rejects.toThrow("Timed out");
    expect(timeout).toHaveBeenCalledWith(10_000);
    expect(searchStories).toHaveBeenCalledWith(params, controller.signal);
    controller.abort(new Error("Timed out"));
    await rejected;
  });

  it("propagates failures so they are not cached", async () => {
    vi.mocked(searchStories).mockRejectedValue(new Error("Algolia API error: 500"));
    await expect(getCachedStories(params)).rejects.toThrow("Algolia API error: 500");
  });
});
