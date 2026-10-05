import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadVote } from "@/lib/votes/client";
vi.unmock("@/lib/votes/client");
const fetchMock = vi.fn();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });
describe("vote reads", () => {
  it("coalesces reads from the same render into one uncached GET", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ "123": { count: 2, voted: true }, "456": { count: 0, voted: false } }) });
    expect(await Promise.all([loadVote("123"), loadVote("456"), loadVote("123")])).toEqual([{ count: 2, voted: true }, { count: 0, voted: false }, { count: 2, voted: true }]);
    expect(fetchMock).toHaveBeenCalledTimes(1); expect(fetchMock).toHaveBeenCalledWith("/api/votes?ids=123,456", { cache: "no-store" });
  });
  it("starts a new batch for reads after the previous one was sent", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ "123": { count: 1, voted: false } }) });
    await loadVote("123"); await loadVote("123"); expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("reports HTTP errors to every waiting card", async () => {
    fetchMock.mockResolvedValue({ ok: false });
    const results = await Promise.allSettled([loadVote("123"), loadVote("456")]);
    expect(results.map((r) => r.status === "rejected" && (r.reason as Error).message)).toEqual(["Could not load votes", "Could not load votes"]);
  });
  it("reports network errors", async () => { fetchMock.mockRejectedValue(new TypeError("offline")); await expect(loadVote("123")).rejects.toThrow("Could not load votes"); });
});
