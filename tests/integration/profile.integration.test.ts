import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { addComment, listComments } from "@/lib/comments/queries";
import { listCommentReactions } from "@/lib/comments/reactions";
import { setCommentFavorite, upvoteComment } from "@/lib/comments/reaction-actions";
import { getAccountCreatedAt, listFavoriteComments, listUpvotedComments } from "@/lib/profile/queries";
import { anonClient, clientAsUser, createTestUser, deleteTestUser, type TestUser } from "./helpers/testUsers";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("profile and comment reactions through real Supabase", () => {
  let owner: TestUser;
  let other: TestUser;
  let client: SupabaseClient;
  const storyId = String(Date.now());
  const actAs = async (user: TestUser, userClient: SupabaseClient) => {
    vi.mocked(createClient).mockResolvedValue(userClient as never);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: user.id, name: user.email, avatarUrl: null });
  };
  beforeAll(async () => { owner = await createTestUser(); other = await createTestUser(); client = await clientAsUser(owner); });
  afterAll(async () => { await deleteTestUser(owner.id); await deleteTestUser(other.id); });

  it("reads the signed-in account creation timestamp", async () => {
    await actAs(owner, client);
    expect(Date.now() - Date.parse(await getAccountCreatedAt())).toBeLessThan(5 * 60_000);
  });

  it("persists upvotes and favorites, lists them on the profile, and keeps them private", async () => {
    await actAs(owner, client);
    await addComment(storyId, { id: owner.id, name: "Author", avatarUrl: null }, "First");
    await addComment(storyId, { id: owner.id, name: "Author", avatarUrl: null }, "Second");
    const [first, second] = await listComments(storyId);
    expect(await upvoteComment(first.id)).toEqual({}); expect(await upvoteComment(first.id)).toEqual({});
    expect(await upvoteComment(second.id)).toEqual({});
    expect(await setCommentFavorite(second.id, true)).toEqual({}); expect(await setCommentFavorite(second.id, true)).toEqual({});
    expect(await listCommentReactions(owner.id, [first.id, second.id])).toEqual({ upvoted: expect.arrayContaining([first.id, second.id]), favorited: [second.id] });
    expect((await listUpvotedComments(owner.id)).map((comment) => comment.body)).toEqual(["Second", "First"]);
    expect(await listFavoriteComments(owner.id)).toEqual([expect.objectContaining({ id: second.id, story_id: storyId, author: "Author", body: "Second" })]);

    await actAs(other, await clientAsUser(other));
    expect(await listCommentReactions(owner.id, [first.id, second.id])).toEqual({ upvoted: [], favorited: [] });
    expect(await listUpvotedComments(owner.id)).toEqual([]);

    vi.mocked(createClient).mockResolvedValue(anonClient() as never);
    await expect(listFavoriteComments(owner.id)).rejects.toThrow("Could not load favorite comments");

    await actAs(owner, client);
    expect(await setCommentFavorite(second.id, false)).toEqual({});
    expect(await listFavoriteComments(owner.id)).toEqual([]);
  });
});
