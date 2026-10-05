import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { loadVotes, upvote } from "@/lib/votes/actions";
import { anonClient, clientAsUser, createTestUser, deleteTestUser, type TestUser } from "./helpers/testUsers";
vi.unmock("@/lib/votes/actions");
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
describe("votes through real Supabase", () => {
  let owner: TestUser;
  let other: TestUser;
  let client: SupabaseClient;
  const storyId = String(Date.now());
  beforeAll(async () => { owner = await createTestUser(); other = await createTestUser(); client = await clientAsUser(owner); });
  afterAll(async () => { await deleteTestUser(owner.id); await deleteTestUser(other.id); });
  it("persists exactly one vote for repeated requests and reloads selected state", async () => {
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: owner.id, name: owner.email, avatarUrl: null });
    expect(await upvote(storyId)).toEqual({}); expect(await upvote(storyId)).toEqual({});
    expect((await loadVotes([storyId]))[storyId]).toEqual({ count: 1, voted: true });
  });
  it("counts all users' votes while keeping voter identities private", async () => {
    const otherClient = await clientAsUser(other);
    vi.mocked(createClient).mockResolvedValue(otherClient as never);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: other.id, name: other.email, avatarUrl: null });
    expect(await upvote(storyId)).toEqual({});
    expect((await loadVotes([storyId]))[storyId]).toEqual({ count: 2, voted: true });
    expect((await otherClient.from("votes").select("user_id").eq("story_id", storyId)).data).toEqual([{ user_id: other.id }]);
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: owner.id, name: owner.email, avatarUrl: null });
    expect((await loadVotes([storyId]))[storyId]).toEqual({ count: 2, voted: true });
    vi.mocked(createClient).mockResolvedValue(anonClient() as never); vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect((await loadVotes([storyId]))[storyId]).toEqual({ count: 2, voted: false }); expect(await upvote(storyId)).toEqual({ error: "Sign in to upvote." });
    expect((await anonClient().from("votes").select("user_id").eq("story_id", storyId)).data).toEqual([]);
    const unvoted = String(Number(storyId) + 1);
    expect(await loadVotes([unvoted])).toEqual({ [unvoted]: { count: 0, voted: false } });
  });
  it("loads several stories in one batch, including ones without votes", async () => {
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: owner.id, name: owner.email, avatarUrl: null });
    const unvoted = String(Number(storyId) + 2);
    expect(await loadVotes([storyId, unvoted])).toEqual({ [storyId]: { count: 2, voted: true }, [unvoted]: { count: 0, voted: false } });
  });
});
