import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadVote, upvote } from "@/lib/votes/actions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { authUser } from "../../fixtures/stories";
import { mockQueryBuilder } from "../../helpers/mockSupabase";
vi.unmock("@/lib/votes/actions");
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
beforeEach(() => { vi.mocked(getCurrentUser).mockResolvedValue(authUser); });
function database(count = 2, voted = false, error: { message: string } | null = null) {
  const rows = [{ data: null, count, error }, { data: voted ? { user_id: authUser.id } : null, error }];
  const builders = rows.map((result) => { const { builder } = mockQueryBuilder(result); builder.maybeSingle = vi.fn(async () => result); return builder; });
  const [countBuilder, selectionBuilder] = builders;
  const write = vi.fn(async () => ({ error }));
  const from = vi.fn(() => ({ ...builders.shift(), upsert: write }));
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { from, write, countBuilder, selectionBuilder };
}
describe("votes", () => {
  it("loads the aggregate count and current user's vote", async () => {
    const { from, countBuilder, selectionBuilder } = database(2, true);
    expect(await loadVote("123")).toEqual({ count: 2, voted: true });
    expect(from).toHaveBeenCalledWith("votes");
    expect(countBuilder.select).toHaveBeenCalledWith("story_id", { count: "exact", head: true });
    expect(countBuilder.eq).toHaveBeenCalledWith("story_id", "123");
    expect(selectionBuilder.select).toHaveBeenCalledWith("user_id");
    expect(selectionBuilder.eq).toHaveBeenCalledWith("story_id", "123");
    expect(selectionBuilder.eq).toHaveBeenCalledWith("user_id", authUser.id);
  });
  it("handles anonymous readers and empty counts", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null); const { from } = database(null as never);
    expect(await loadVote("123")).toEqual({ count: 0, voted: false }); expect(from).toHaveBeenCalledTimes(1);
  });
  it("handles a missing count for a signed-in reader", async () => { database(null as never); expect(await loadVote("123")).toEqual({ count: 0, voted: false }); });
  it("handles a signed-in non-voter", async () => { database(); expect(await loadVote("123")).toEqual({ count: 2, voted: false }); });
  it("reports count and selection failures", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null); database(0, false, { message: "offline" }); await expect(loadVote("123")).rejects.toThrow("Could not load votes");
    const { builder } = mockQueryBuilder({ count: 2 }); const from = vi.fn().mockReturnValueOnce(builder).mockReturnValueOnce({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ error: { message: "selection" } }) }) }) }) });
    vi.mocked(createClient).mockResolvedValue({ from } as never); await expect(loadVote("123")).rejects.toThrow("Could not load votes");
  });
  it.each(["bad", "0", "1/2"])("rejects invalid story ids %s", async (id) => {
    await expect(loadVote(id)).rejects.toThrow("Invalid story id"); await expect(upvote(id)).rejects.toThrow("Invalid story id");
  });
  it("asks anonymous users to sign in without writing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null); const { write } = database(); expect(await upvote("123")).toEqual({ error: "Sign in to upvote." }); expect(write).not.toHaveBeenCalled();
  });
  it("persists one vote idempotently using the authenticated user id", async () => {
    const { from, write } = database(); expect(await upvote("123")).toEqual({}); expect(from).toHaveBeenCalledWith("votes");
    expect(write).toHaveBeenCalledWith({ story_id: "123", user_id: authUser.id }, { onConflict: "user_id,story_id", ignoreDuplicates: true });
  });
  it("returns a retry message on write failures", async () => { database(0, false, { message: "offline" }); expect(await upvote("123")).toEqual({ error: "Could not upvote. Please try again." }); });
});
