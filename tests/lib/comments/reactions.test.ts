import { beforeEach, describe, expect, it, vi } from "vitest";
import { listCommentReactions } from "@/lib/comments/reactions";
import { setCommentFavorite, upvoteComment } from "@/lib/comments/reaction-actions";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { mockQueryBuilder } from "../../helpers/mockSupabase";
import { authUser } from "../../fixtures/stories";

vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
beforeEach(() => { vi.mocked(getCurrentUser).mockResolvedValue(authUser); });

const commentId = "6f1c1b7e-8a43-4c2e-9d55-0c3f4d7f1a2b";
function database(...results: { data?: unknown; error?: unknown }[]) {
  const builders = results.map((result) => {
    const { builder } = mockQueryBuilder(result);
    builder.in = vi.fn(() => builder);
    builder.insert = vi.fn(() => builder);
    return builder;
  });
  const queue = [...builders];
  const from = vi.fn(() => queue.shift());
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { from, builders };
}

describe("comment reactions", () => {
  it("lists the user's upvoted and favorite comment ids among the given comments", async () => {
    const { from, builders: [votes, favorites] } = database({ data: [{ comment_id: "a" }] }, { data: [{ comment_id: "b" }] });
    expect(await listCommentReactions(authUser.id, ["a", "b"])).toEqual({ upvoted: ["a"], favorited: ["b"] });
    expect(from).toHaveBeenNthCalledWith(1, "comment_votes");
    expect(from).toHaveBeenNthCalledWith(2, "comment_favorites");
    for (const builder of [votes, favorites]) {
      expect(builder.select).toHaveBeenCalledWith("comment_id");
      expect(builder.eq).toHaveBeenCalledWith("user_id", authUser.id);
      expect(builder.in).toHaveBeenCalledWith("comment_id", ["a", "b"]);
    }
  });
  it("skips the database without a user or comments", async () => {
    const { from } = database();
    expect(await listCommentReactions(null, ["a"])).toEqual({ upvoted: [], favorited: [] });
    expect(await listCommentReactions(authUser.id, [])).toEqual({ upvoted: [], favorited: [] });
    expect(from).not.toHaveBeenCalled();
  });
  it("treats missing rows as no reactions and reports failures", async () => {
    database({ data: null }, { data: null });
    expect(await listCommentReactions(authUser.id, ["a"])).toEqual({ upvoted: [], favorited: [] });
    database({ data: [] }, { error: { message: "offline" } });
    await expect(listCommentReactions(authUser.id, ["a"])).rejects.toThrow("Could not load comment reactions: offline");
    database({ error: { message: "down" } }, { data: [] });
    await expect(listCommentReactions(authUser.id, ["a"])).rejects.toThrow("Could not load comment reactions: down");
  });
});

describe("comment reaction actions", () => {
  it.each(["bad", "", "123", `${commentId}x`, `x${commentId}`])("rejects invalid comment id %s", async (id) => {
    await expect(upvoteComment(id)).rejects.toThrow("Invalid comment id");
    await expect(setCommentFavorite(id, true)).rejects.toThrow("Invalid comment id");
  });
  it("asks anonymous users to sign in without writing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const { from } = database();
    expect(await upvoteComment(commentId)).toEqual({ error: "Sign in to upvote." });
    expect(await setCommentFavorite(commentId, true)).toEqual({ error: "Sign in to favorite." });
    expect(from).not.toHaveBeenCalled();
  });
  it("persists one upvote idempotently and refreshes the profile", async () => {
    const { from, builders: [builder] } = database({});
    expect(await upvoteComment(commentId.toUpperCase())).toEqual({});
    expect(from).toHaveBeenCalledWith("comment_votes");
    expect(builder.upsert).toHaveBeenCalledWith({ comment_id: commentId.toUpperCase(), user_id: authUser.id }, { onConflict: "user_id,comment_id", ignoreDuplicates: true });
    expect(revalidatePath).toHaveBeenCalledWith("/profile");
  });
  it("adds and removes favorites for the authenticated user", async () => {
    const { from, builders: [add, remove] } = database({}, {});
    expect(await setCommentFavorite(commentId, true)).toEqual({});
    expect(add.upsert).toHaveBeenCalledWith({ comment_id: commentId, user_id: authUser.id }, { onConflict: "user_id,comment_id", ignoreDuplicates: true });
    expect(await setCommentFavorite(commentId, false)).toEqual({});
    expect(remove.delete).toHaveBeenCalled();
    expect(remove.eq).toHaveBeenCalledWith("user_id", authUser.id);
    expect(remove.eq).toHaveBeenCalledWith("comment_id", commentId);
    expect(from).toHaveBeenCalledWith("comment_favorites");
    expect(vi.mocked(revalidatePath).mock.calls).toEqual([["/profile"], ["/profile"]]);
  });
  it("returns retry messages on write failures", async () => {
    database({ error: { message: "offline" } }, { error: { message: "offline" } }, { error: { message: "offline" } });
    expect(await upvoteComment(commentId)).toEqual({ error: "Could not upvote. Please try again." });
    expect(await setCommentFavorite(commentId, true)).toEqual({ error: "Could not update favorite. Please try again." });
    expect(await setCommentFavorite(commentId, false)).toEqual({ error: "Could not update favorite. Please try again." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
