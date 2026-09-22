import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getBookmarkIds, listBookmarks, setBookmark } from "@/lib/bookmarks/queries";
import { getCurrentUser } from "@/lib/auth/user";
import { makeStory } from "../fixtures/stories";
import { anonClient, clientAsUser, createTestUser, deleteTestUser, type TestUser } from "./helpers/testUsers";
import { supabaseAdmin } from "./helpers/supabaseAdmin";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);

/** Swaps the client the app's queries/actions use for the rest of the current test. */
function actAs(client: SupabaseClient) {
  mockedCreateClient.mockResolvedValue(client as never);
}

/** HN object ids are numeric strings; toHNStory derives story_id via Number(object_id). */
function uniqueStory() {
  const objectID = String(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
  return makeStory({ objectID, story_id: Number(objectID) });
}

/** Saves a fresh, uniquely-identified bookmark as user A and returns it. */
async function seedBookmarkAsUserA(userA: TestUser, clientA: SupabaseClient) {
  const story = uniqueStory();
  actAs(clientA);
  await setBookmark(story, userA.id, false);
  return story;
}

describe("bookmarks against a real local Supabase instance", () => {
  let userA: TestUser;
  let userB: TestUser;
  let clientA: SupabaseClient;
  let clientB: SupabaseClient;

  beforeAll(async () => {
    userA = await createTestUser();
    userB = await createTestUser();
    clientA = await clientAsUser(userA);
    clientB = await clientAsUser(userB);
  });

  afterEach(async () => {
    await supabaseAdmin.from("bookmarks").delete().in("user_id", [userA.id, userB.id]);
  });

  // Deleting the users cascades to any remaining bookmarks (`on delete cascade`).
  afterAll(async () => {
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  it("only shows a user their own bookmarks, enforced by real RLS through the app's query layer", async () => {
    const story = await seedBookmarkAsUserA(userA, clientA);

    actAs(clientA);
    expect(await listBookmarks(userA.id)).toEqual([story]);
    expect(await getBookmarkIds(userA.id)).toEqual([story.objectID]);

    // Same query, run as user B's real session: RLS hides A's row entirely.
    actAs(clientB);
    expect(await listBookmarks(userA.id)).toEqual([]);
  });

  it("rejects writing a bookmark under another user's id, surfacing a real PostgREST error", async () => {
    const story = uniqueStory();

    // Authenticated as B, but claiming the row belongs to A: RLS's `with check` rejects the insert.
    actAs(clientB);
    await expect(setBookmark(story, userA.id, false)).rejects.toThrow(/Could not update bookmark/);
  });

  it("anon cannot read any bookmarks", async () => {
    await seedBookmarkAsUserA(userA, clientA);

    actAs(anonClient());
    expect(await listBookmarks(userA.id)).toEqual([]);
  });

  it("resolves the signed-in user's identity from a real GoTrue-issued session", async () => {
    actAs(clientA);
    const user = await getCurrentUser();
    expect(user).toMatchObject({ id: userA.id, name: userA.email });
  });
});
