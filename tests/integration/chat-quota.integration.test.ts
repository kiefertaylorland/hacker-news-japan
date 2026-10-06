import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { consumeChatQuota } from "@/lib/chat/quota";
import { anonClient, clientAsUser, createTestUser, deleteTestUser, type TestUser } from "./helpers/testUsers";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
describe("chat quotas through real Supabase", () => {
  let owner: TestUser;
  let client: SupabaseClient;
  beforeAll(async () => { owner = await createTestUser(); client = await clientAsUser(owner); });
  afterAll(async () => { await deleteTestUser(owner.id); });
  it("atomically allows only ten of twelve concurrent requests", async () => {
    vi.mocked(createClient).mockResolvedValue(client as never);
    const decisions = await Promise.all(Array.from({ length: 12 }, () => consumeChatQuota(new AbortController().signal)));
    expect(decisions.filter(Boolean)).toHaveLength(10);
    expect(decisions.filter((allowed) => !allowed)).toHaveLength(2);
  });
  it("denies anonymous quota access", async () => {
    vi.mocked(createClient).mockResolvedValue(anonClient() as never);
    await expect(consumeChatQuota(new AbortController().signal)).rejects.toThrow("Chat quota unavailable.");
  });
});
