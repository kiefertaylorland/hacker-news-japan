import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { authUser, sampleBookmarkRow as row, sampleStory as story } from "../../fixtures/stories";
import { mockQueryBuilder, type QueryResult } from "../../helpers/mockSupabase";

vi.mock("next/navigation", () => import("../../helpers/mockNext").then((m) => m.navigationMock()));
vi.mock("next/cache", () => import("../../helpers/mockNext").then((m) => m.cacheMock()));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const mockedGetCurrentUser = vi.mocked(getCurrentUser);

function mockQuery(result: QueryResult) {
  const { from, builder } = mockQueryBuilder(result);
  mockedCreateClient.mockResolvedValue({ from } as never);
  return { from, builder };
}

beforeEach(() => {
  mockedCreateClient.mockReset();
  mockedGetCurrentUser.mockReset();
});

describe("toggleBookmark", () => {
  it("redirects anonymous users", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);
    await expect(toggleBookmark(story, false)).rejects.toThrow("REDIRECT:/?auth_error=1");
  });

  it("upserts a bookmark idempotently and revalidates both pages", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { builder } = mockQuery({ error: null });
    await toggleBookmark(story, false);
    expect(builder.upsert).toHaveBeenCalledWith(row, {
      onConflict: "user_id,object_id",
      ignoreDuplicates: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/saved");
  });

  it("deletes a saved bookmark", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { builder } = mockQuery({ error: null });
    await toggleBookmark(story, true);
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.eq).toHaveBeenCalledWith("object_id", "123");
  });

  it("surfaces database errors", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    mockQuery({ error: { message: "rls" } });
    await expect(toggleBookmark(story, false)).rejects.toThrow("Could not update bookmark: rls");
  });
});
