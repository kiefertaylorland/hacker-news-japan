import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadVote } from "@/lib/votes/client";
vi.unmock("@/lib/votes/client");
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); });
describe("vote reads", () => {
  it("fetches uncached state through an HTTP GET so cards can load in parallel", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ count: 2, voted: true }) });
    expect(await loadVote("123")).toEqual({ count: 2, voted: true }); expect(fetchMock).toHaveBeenCalledWith("/api/votes/123", { cache: "no-store" });
  });
  it("reports HTTP errors", async () => { fetchMock.mockResolvedValue({ ok: false }); await expect(loadVote("123")).rejects.toThrow("Could not load votes"); });
});
