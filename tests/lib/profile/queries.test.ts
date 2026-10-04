import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAccountCreatedAt, listFavoriteComments, listUpvotedComments, listUpvotedStories } from "@/lib/profile/queries";
import { createClient } from "@/lib/supabase/server";
import { makeResults, makeStory } from "../../fixtures/stories";
import { mockQueryBuilder } from "../../helpers/mockSupabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });

function database(result: { data?: unknown; error?: unknown }, getUser = vi.fn()) {
  const { from, builder } = mockQueryBuilder(result);
  builder.limit = vi.fn(() => builder);
  vi.mocked(createClient).mockResolvedValue({ from, auth: { getUser } } as never);
  return { from, builder, getUser };
}
const comment = { id: "c1", story_id: "123", author: "octocat", body: "Hello", created_at: "2026-10-04T00:00:00.000Z" };

describe("profile queries", () => {
  it("reads the account creation timestamp from the verified auth user", async () => {
    const getUser = vi.fn(async () => ({ data: { user: { created_at: "2026-10-04T01:02:03Z" } }, error: null }));
    database({}, getUser);
    expect(await getAccountCreatedAt()).toBe("2026-10-04T01:02:03Z");
    getUser.mockResolvedValueOnce({ data: { user: null }, error: { message: "expired" } } as never);
    await expect(getAccountCreatedAt()).rejects.toThrow("Could not load profile: expired");
  });

  it("lists upvoted submissions newest vote first using HN story details", async () => {
    const { from, builder } = database({ data: [{ story_id: "2" }, { story_id: "9" }, { story_id: "1" }] });
    fetchMock.mockResolvedValue({ ok: true, json: async () => makeResults({ hits: [makeStory({ objectID: "1" }), makeStory({ objectID: "2" })] }) });
    expect((await listUpvotedStories("user-1")).map((story) => story.objectID)).toEqual(["2", "1"]);
    expect(from).toHaveBeenCalledWith("votes");
    expect(builder.select).toHaveBeenCalledWith("story_id");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(30);
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe("https://hn.algolia.com/api/v1/search");
    expect(url.searchParams.get("tags")).toBe("(story,poll,job),(story_2,story_9,story_1)");
    expect(url.searchParams.get("hitsPerPage")).toBe("3");
  });

  it("skips HN when nothing is upvoted and reports failures", async () => {
    database({ data: null });
    expect(await listUpvotedStories("user-1")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    database({ error: { message: "offline" } });
    await expect(listUpvotedStories("user-1")).rejects.toThrow("Could not load upvoted submissions: offline");
    database({ data: [{ story_id: "1" }] });
    fetchMock.mockResolvedValue({ ok: false, status: 503 });
    await expect(listUpvotedStories("user-1")).rejects.toThrow("Algolia API error: 503");
  });

  it.each([
    ["upvoted", listUpvotedComments, "comment_votes"],
    ["favorite", listFavoriteComments, "comment_favorites"],
  ] as const)("lists %s comments newest first", async (label, list, table) => {
    const { from, builder } = database({ data: [{ comment }] });
    expect(await list("user-1")).toEqual([comment]);
    expect(from).toHaveBeenCalledWith(table);
    expect(builder.select).toHaveBeenCalledWith("comment:comments(id, story_id, author, body, created_at)");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(30);
    database({ data: null });
    expect(await list("user-1")).toEqual([]);
    database({ error: { message: "offline" } });
    await expect(list("user-1")).rejects.toThrow(`Could not load ${label} comments: offline`);
  });
});
