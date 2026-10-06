import { describe, expect, it, vi } from "vitest";
import { getArticleContext } from "@/lib/chat/context";
import { getDiscussion } from "@/lib/comments/algolia";
vi.mock("@/lib/comments/algolia", () => ({ getDiscussion: vi.fn() }));
describe("article context", () => {
  it("forwards request cancellation to article fetching", async () => {
    vi.mocked(getDiscussion).mockResolvedValue(null);
    const signal = new AbortController().signal;
    await getArticleContext("123", signal);
    expect(getDiscussion).toHaveBeenCalledWith("123", signal);
  });
  it("returns null for a missing article", async () => {
    vi.mocked(getDiscussion).mockResolvedValue(null); expect(await getArticleContext("123")).toBeNull();
  });
  it("strips HTML and bounds title, submission text, and comments", async () => {
    vi.mocked(getDiscussion).mockResolvedValue({ id: 123, type: "story", title: "Title " + "x".repeat(501), url: "https://example.com/article", text: `<p>Prefix:${"a".repeat(2001)}</p><script>evil</script>`, children: Array.from({ length: 13 }, (_, i) => ({ id: i, author: "a", created_at: "", text: `<p>comment${i}</p>`, children: [] })) });
    const result = await getArticleContext("123");
    expect(result).toEqual({ id: "123", title: "Title " + "x".repeat(494), url: "https://example.com/article", discussionUrl: "https://news.ycombinator.com/item?id=123", text: "Prefix:" + "a".repeat(1993), comments: Array.from({ length: 12 }, (_, i) => `comment${i}`) });
    expect(getDiscussion).toHaveBeenCalledWith("123", undefined);
  });
  it.each([undefined, null, "javascript:alert(1)"])("handles missing text and absent/unsafe article links (%s)", async (url) => {
    vi.mocked(getDiscussion).mockResolvedValue({ id: 123, type: "story", title: "Japan", url, children: [{ id: 1, author: null, created_at: "", text: null, children: [] }] });
    expect(await getArticleContext("123")).toMatchObject({ text: "", url: "https://news.ycombinator.com/item?id=123", comments: [""] });
  });
});
