import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import { loadVote, upvote } from "@/lib/votes/actions";
import { anonClient, clientAsUser, createTestUser, deleteTestUser, type TestUser } from "./helpers/testUsers";
vi.unmock("@/lib/votes/actions");
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
describe("votes through real Supabase", () => {
  let owner: TestUser;
  let client: SupabaseClient;
  const storyId = String(Date.now());
  beforeAll(async () => { owner = await createTestUser(); client = await clientAsUser(owner); });
  afterAll(async () => { await deleteTestUser(owner.id); });
  it("persists exactly one vote for repeated requests and reloads selected state", async () => {
    vi.mocked(createClient).mockResolvedValue(client as never);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: owner.id, name: owner.email, avatarUrl: null });
    expect(await upvote(storyId)).toEqual({}); expect(await upvote(storyId)).toEqual({});
    expect(await loadVote(storyId)).toEqual({ count: 1, voted: true });
  });
  it("lets anonymous readers see the count and prevents anonymous writes", async () => {
    vi.mocked(createClient).mockResolvedValue(anonClient() as never); vi.mocked(getCurrentUser).mockResolvedValue(null);
    expect(await loadVote(storyId)).toEqual({ count: 1, voted: false }); expect(await upvote(storyId)).toEqual({ error: "Sign in to upvote." });
  });
});
