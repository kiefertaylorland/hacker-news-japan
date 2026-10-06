import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolLoopAgent } from "ai";
import { createChatAgent } from "@/lib/chat/agent";
import { topicPolicy } from "@/lib/chat/alignment";
import { searchStories } from "@/lib/search/api";
import { makeResults, makeStory } from "../../fixtures/stories";
import { z } from "zod";
vi.mock("ai", async (importOriginal) => ({ ...await importOriginal<typeof import("ai")>(), ToolLoopAgent: vi.fn(function (settings) { return settings; }) }));
vi.mock("@/lib/search/api", () => ({ searchStories: vi.fn() }));
beforeEach(() => { vi.mocked(searchStories).mockResolvedValue(makeResults()); });
describe("Japan chat agent", () => {
  it("uses the configured model, bounded generation, and evidence instructions", () => {
    createChatAgent("provider/model", null);
    const options = vi.mocked(ToolLoopAgent).mock.calls[0][0];
    expect(options.model).toBe("provider/model"); expect(options.maxOutputTokens).toBe(2000);
    if (typeof options.stopWhen !== "function") throw new Error("Expected a stop condition");
    expect(options.stopWhen({ steps: Array(3).fill({}) } as never)).toBe(true);
    expect(options.stopWhen({ steps: Array(2).fill({}) } as never)).toBe(false);
    expect(options.instructions).toContain(topicPolicy);
    expect(options.instructions).toContain("outside this scope");
    expect(options.instructions).toContain("No article is selected.");
    expect(options.instructions).toContain("untrusted evidence");
    expect(options.instructions).toContain("Never invent sources");
    expect(options.instructions).toContain("Search covers Hacker News, not the entire web.");
  });
  it("includes server-fetched article context", () => {
    const article = { id: "123", title: "Japan", url: "https://example.com", discussionUrl: "https://news.ycombinator.com/item?id=123", text: "submission", comments: ["comment"] };
    createChatAgent("provider/model", article);
    expect(vi.mocked(ToolLoopAgent).mock.calls[0][0].instructions).toContain(JSON.stringify(article));
  });
  it.each([true, false])("researches bounded sources and forwards cancellation (%s)", async (withSignal) => {
    vi.mocked(searchStories).mockResolvedValue(makeResults({ hits: Array.from({ length: 7 }, (_, i) => makeStory({ objectID: String(i + 1), url: i ? null : "https://example.com" })) }));
    const agent = createChatAgent("provider/model", null);
    const controller = new AbortController();
    const signal = withSignal ? controller.signal : undefined;
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const result = await agent.tools.searchStories.execute({ query: "technology" }, { toolCallId: "1", messages: [], abortSignal: signal, context: {} });
    expect(result).toHaveLength(6);
    expect(result[0]).toEqual({ title: "Building in Japan", url: "https://example.com", discussionUrl: "https://news.ycombinator.com/item?id=1", publishedAt: "1970-01-01T00:00:10.000Z" });
    expect(result[1].url).toBe("https://news.ycombinator.com/item?id=2");
    expect(searchStories).toHaveBeenCalledWith({ query: "technology", storyType: "story", dateRange: "all", sortBy: "relevance", page: 0 }, expect.any(AbortSignal));
    expect(timeout).toHaveBeenCalledWith(10000);
    const searchSignal = vi.mocked(searchStories).mock.calls[0][1]!;
    expect(searchSignal.aborted).toBe(false); controller.abort(); expect(searchSignal.aborted).toBe(withSignal);
  });
  it("validates research queries before execution", () => {
    const agent = createChatAgent("provider/model", null);
    const schema = agent.tools.searchStories.inputSchema as z.ZodType<{ query: string }>;
    for (const query of ["x", "x".repeat(200)]) expect(schema.safeParse({ query }).success).toBe(true);
    for (const query of ["", " ", "x".repeat(201)]) expect(schema.safeParse({ query }).success).toBe(false);
    expect(schema.parse({ query: "  technology  " })).toEqual({ query: "technology" });
    expect(agent.tools.searchStories.description).toContain("source links and publication dates");
  });
  it("surfaces upstream search failure instead of inventing results", async () => {
    vi.mocked(searchStories).mockRejectedValue(new Error("offline"));
    const agent = createChatAgent("provider/model", null);
    expect.assertions(1);
    try {
      await agent.tools.searchStories.execute({ query: "technology" }, { toolCallId: "1", messages: [], context: {} });
    } catch (error) {
      expect(error).toEqual(new Error("offline"));
    }
  });
});
