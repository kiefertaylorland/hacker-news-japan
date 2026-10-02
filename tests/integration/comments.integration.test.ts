import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { addComment, listComments } from "@/lib/comments/queries";
import { anonClient, clientAsUser, createTestUser, deleteTestUser, type TestUser } from "./helpers/testUsers";
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
describe("comments through real Supabase", () => {
  let owner: TestUser;
  let client: SupabaseClient;
  const storyId = String(Date.now());
  beforeAll(async () => { owner = await createTestUser(); client = await clientAsUser(owner); });
  afterAll(async () => { await deleteTestUser(owner.id); });
  it("persists a comment through the app query layer and exposes it to anonymous readers", async () => {
    vi.mocked(createClient).mockResolvedValue(client as never);
    await addComment(storyId, { id: owner.id, name: "Comment author", avatarUrl: null }, "Hello Japan");
    vi.mocked(createClient).mockResolvedValue(anonClient() as never);
    expect(await listComments(storyId)).toEqual([expect.objectContaining({ author: "Comment author", body: "Hello Japan" })]);
  });
  it("rejects anonymous posting through PostgREST", async () => {
    vi.mocked(createClient).mockResolvedValue(anonClient() as never);
    await expect(addComment(storyId, { id: owner.id, name: "Spoof", avatarUrl: null }, "No")).rejects.toThrow("Could not post comment");
  });
  it("rejects a forged user id", async () => {
    vi.mocked(createClient).mockResolvedValue(client as never);
    await expect(addComment(storyId, { id: crypto.randomUUID(), name: "Spoof", avatarUrl: null }, "No")).rejects.toThrow("Could not post comment");
  });
});
