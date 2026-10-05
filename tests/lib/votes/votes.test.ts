import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadVotes, upvote } from "@/lib/votes/actions";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { authUser } from "../../fixtures/stories";
import { mockQueryBuilder } from "../../helpers/mockSupabase";
vi.unmock("@/lib/votes/actions");
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
beforeEach(() => { vi.mocked(getCurrentUser).mockResolvedValue(authUser); });
function database(counts: { story_id: string; count: number }[] = [{ story_id: "123", count: 2 }], voted: string[] = [], error: { message: string } | null = null) {
  const { builder: selectionBuilder } = mockQueryBuilder({ data: voted.map((story_id) => ({ story_id })), error });
  selectionBuilder.in = vi.fn(() => selectionBuilder);
  const rpc = vi.fn(async () => ({ data: counts, error }));
  const write = vi.fn(async () => ({ error }));
  const from = vi.fn(() => ({ ...selectionBuilder, upsert: write }));
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  return { from, rpc, write, selectionBuilder };
}
describe("votes", () => {
  it("loads every story's aggregate count and the current user's votes in two queries", async () => {
    const { from, rpc, selectionBuilder } = database([{ story_id: "123", count: 2 }, { story_id: "789", count: 5 }], ["789"]);
    expect(await loadVotes(["123", "456", "789"])).toEqual({ "123": { count: 2, voted: false }, "456": { count: 0, voted: false }, "789": { count: 5, voted: true } });
    expect(rpc).toHaveBeenCalledTimes(1); expect(rpc).toHaveBeenCalledWith("story_vote_counts", { requested_story_ids: ["123", "456", "789"] });
    expect(from).toHaveBeenCalledTimes(1); expect(from).toHaveBeenCalledWith("votes");
    expect(selectionBuilder.select).toHaveBeenCalledWith("story_id");
    expect(selectionBuilder.in).toHaveBeenCalledWith("story_id", ["123", "456", "789"]);
    expect(selectionBuilder.eq).toHaveBeenCalledWith("user_id", authUser.id);
  });
  it("handles anonymous readers without reading voter rows", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null); const { from } = database();
    expect(await loadVotes(["123"])).toEqual({ "123": { count: 2, voted: false } }); expect(from).not.toHaveBeenCalled();
  });
  it("reports count and selection failures", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null); database([], [], { message: "offline" }); await expect(loadVotes(["123"])).rejects.toThrow("Could not load votes");
    const { builder } = mockQueryBuilder({ data: null, error: { message: "selection" } }); builder.in = vi.fn(() => builder);
    vi.mocked(createClient).mockResolvedValue({ from: () => builder, rpc: vi.fn(async () => ({ data: [], error: null })) } as never); await expect(loadVotes(["123"])).rejects.toThrow("Could not load votes");
  });
  it("rejects empty and oversized batches before querying", async () => {
    const { rpc } = database();
    await expect(loadVotes([])).rejects.toThrow("Invalid story ids");
    await expect(loadVotes(Array.from({ length: 101 }, (_, i) => String(i + 1)))).rejects.toThrow("Invalid story ids");
    expect(await loadVotes(Array.from({ length: 100 }, (_, i) => String(i + 1)))).toHaveProperty("100"); expect(rpc).toHaveBeenCalledTimes(1);
  });
  it.each(["bad", "0", "1/2"])("rejects invalid story ids %s", async (id) => {
    await expect(loadVotes(["123", id])).rejects.toThrow("Invalid story id"); await expect(upvote(id)).rejects.toThrow("Invalid story id");
  });
  it("asks anonymous users to sign in without writing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null); const { write } = database(); expect(await upvote("123")).toEqual({ error: "Sign in to upvote." }); expect(write).not.toHaveBeenCalled();
  });
  it("persists one vote idempotently using the authenticated user id", async () => {
    const { from, write } = database(); expect(await upvote("123")).toEqual({}); expect(from).toHaveBeenCalledWith("votes");
    expect(write).toHaveBeenCalledWith({ story_id: "123", user_id: authUser.id }, { onConflict: "user_id,story_id", ignoreDuplicates: true });
  });
  it("returns a retry message on write failures", async () => { database([], [], { message: "offline" }); expect(await upvote("123")).toEqual({ error: "Could not upvote. Please try again." }); });
});
