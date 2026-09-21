import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBookmarkIds, listBookmarks, setBookmark, toBookmarkRow, toHNStory } from "@/lib/bookmarks/queries";
import { createClient } from "@/lib/supabase/server";
import { sampleBookmarkRow as row, sampleStory as story } from "../../fixtures/stories";
import { mockQueryBuilder, type QueryResult } from "../../helpers/mockSupabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);

function mockQuery(result: QueryResult) {
  const { from, builder } = mockQueryBuilder(result);
  mockedCreateClient.mockResolvedValue({ from } as never);
  return { from, builder };
}

beforeEach(() => {
  mockedCreateClient.mockReset();
});

describe("bookmark mappers", () => {
  it("round-trips a story through a bookmark row", () => {
    expect(toBookmarkRow(story, "user-1")).toEqual(row);
    expect(toHNStory(row)).toEqual(story);
  });
});

describe("getBookmarkIds", () => {
  it("returns no ids for anonymous users without touching the database", async () => {
    expect(await getBookmarkIds(null)).toEqual([]);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("lists saved ids for a user", async () => {
    const { from, builder } = mockQuery({ data: [{ object_id: "1" }, { object_id: "2" }] });
    expect(await getBookmarkIds("user-1")).toEqual(["1", "2"]);
    expect(from).toHaveBeenCalledWith("bookmarks");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");

    mockQuery({ data: null });
    expect(await getBookmarkIds("user-1")).toEqual([]);

    mockQuery({ data: null, error: { message: "down" } });
    await expect(getBookmarkIds("user-1")).rejects.toThrow("Could not load bookmarks: down");
  });
});

describe("listBookmarks", () => {
  it("lists bookmarks newest first as stories", async () => {
    const { builder } = mockQuery({ data: [row] });
    expect(await listBookmarks("user-1")).toEqual([story]);
    expect(builder.order).toHaveBeenCalledWith("saved_at", { ascending: false });

    mockQuery({ data: null });
    expect(await listBookmarks("user-1")).toEqual([]);

    mockQuery({ data: null, error: { message: "down" } });
    await expect(listBookmarks("user-1")).rejects.toThrow("Could not load bookmarks: down");
  });
});

describe("setBookmark", () => {
  it("upserts a bookmark idempotently", async () => {
    const { builder } = mockQuery({ error: null });
    await setBookmark(story, "user-1", false);
    expect(builder.upsert).toHaveBeenCalledWith(row, {
      onConflict: "user_id,object_id",
      ignoreDuplicates: true,
    });
  });

  it("deletes a saved bookmark", async () => {
    const { builder } = mockQuery({ error: null });
    await setBookmark(story, "user-1", true);
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.eq).toHaveBeenCalledWith("object_id", "123");
  });

  it("surfaces database errors", async () => {
    mockQuery({ error: { message: "rls" } });
    await expect(setBookmark(story, "user-1", false)).rejects.toThrow("Could not update bookmark: rls");
  });
});
