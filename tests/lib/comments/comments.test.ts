import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDiscussion } from "@/lib/comments/algolia";
import { addComment, listComments } from "@/lib/comments/queries";
import { postComment } from "@/lib/comments/actions";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { mockQueryBuilder } from "../../helpers/mockSupabase";
import { authUser } from "../../fixtures/stories";

vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); vi.mocked(getCurrentUser).mockResolvedValue(authUser); });
function database(result: { data?: unknown; error?: unknown }) {
  const { from, builder } = mockQueryBuilder(result);
  builder.insert = vi.fn(() => builder);
  vi.mocked(createClient).mockResolvedValue({ from } as never);
  return { from, builder };
}

describe("discussions", () => {
  it("fetches a numeric HN story on the server without caching comments", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: 123, type: "story", title: "Japan", children: [] }) });
    expect(await getDiscussion("123")).toMatchObject({ title: "Japan" });
    expect(fetchMock).toHaveBeenCalledWith("https://hn.algolia.com/api/v1/items/123", { cache: "no-store" });
  });
  it.each(["abc", "0", "-1", "12/34", "0123", "123x", "x123", "", "1\n"])("rejects invalid id %s before network access", async (id) => {
    await expect(getDiscussion(id)).rejects.toThrow("Invalid story id"); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("returns null for missing items and comments", async () => {
    fetchMock.mockResolvedValueOnce({ status: 404 }).mockResolvedValueOnce({ ok: true, json: async () => ({ type: "comment" }) });
    expect(await getDiscussion("123")).toBeNull(); expect(await getDiscussion("123")).toBeNull();
  });
  it("reports upstream failures", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503 }); await expect(getDiscussion("123")).rejects.toThrow("Could not load discussion: 503");
  });
  it("lists local comments oldest first, including an empty result", async () => {
    const row = { id: "a", body: "Hello" }; const { from, builder } = database({ data: [row] });
    expect(await listComments("123")).toEqual([row]); expect(from).toHaveBeenCalledWith("comments"); expect(builder.select).toHaveBeenCalledWith("id, author, body, created_at"); expect(builder.eq).toHaveBeenCalledWith("story_id", "123"); expect(builder.order).toHaveBeenCalledWith("created_at", { ascending: true });
    database({ data: null }); expect(await listComments("123")).toEqual([]);
    database({ error: { message: "offline" } }); await expect(listComments("123")).rejects.toThrow("Could not load comments: offline");
  });
  it("inserts plain text with the server-authenticated author", async () => {
    const { from, builder } = database({}); await addComment("123", authUser, "Hi");
    expect(from).toHaveBeenCalledWith("comments"); expect(builder.insert).toHaveBeenCalledWith({ story_id: "123", user_id: authUser.id, author: authUser.name, body: "Hi" });
    database({ error: { message: "denied" } }); await expect(addComment("123", authUser, "Hi")).rejects.toThrow("Could not post comment: denied");
  });
  it("requires sign-in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null); expect(await postComment("123", "Hi")).toEqual({ error: "Sign in to comment." });
  });
  it.each(["", "   ", "x".repeat(10001)])("rejects invalid comment content", async (body) => {
    expect(await postComment("123", body)).toEqual({ error: "Enter a comment between 1 and 10,000 characters." });
  });
  it("validates action arguments at runtime", async () => {
    await expect(postComment("bad", "Hi")).rejects.toThrow("Invalid story id");
    expect(await postComment("123", null as never)).toEqual({ error: "Enter a comment between 1 and 10,000 characters." });
  });
  it("posts trimmed content and refreshes the discussion", async () => {
    const { builder } = database({}); expect(await postComment("123", " Hi ")).toEqual({});
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ body: "Hi" })); expect(revalidatePath).toHaveBeenCalledWith("/stories/123");
  });
  it("accepts exactly the maximum comment length", async () => {
    const { builder } = database({}); const body = "x".repeat(10000);
    expect(await postComment("123", body)).toEqual({});
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ body }));
  });
  it("applies the length limit after trimming", async () => {
    const { builder } = database({}); const body = "x".repeat(10000);
    expect(await postComment("123", ` ${body} `)).toEqual({});
    expect(builder.insert).toHaveBeenCalledWith(expect.objectContaining({ body }));
  });
  it("returns a retry message on persistence failure", async () => {
    database({ error: { message: "offline" } }); expect(await postComment("123", "Hi")).toEqual({ error: "Could not post comment. Please try again." });
  });
});
