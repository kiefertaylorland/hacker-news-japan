import { describe, expect, it, vi } from "vitest";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { createAlignedChatResponse } from "@/lib/chat/response";
import { searchStories } from "@/lib/search/api";
import { sampleResults } from "../../fixtures/stories";
vi.mock("@/lib/search/api", () => ({ searchStories: vi.fn() }));
const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 5, text: 5, reasoning: undefined } };

describe("real SDK chat streaming", () => {
  it("executes source research and streams a final answer with article and follow-up context", async () => {
    vi.mocked(searchStories).mockResolvedValue(sampleResults);
    const model = new MockLanguageModelV4({
      doGenerate: async () => ({ content: [{ type: "text", text: '{"allowed":true}' }], finishReason: { unified: "stop", raw: undefined }, usage, warnings: [] }),
      doStream: [
      { stream: simulateReadableStream({ initialDelayInMs: null, chunkDelayInMs: null, chunks: [
        { type: "stream-start", warnings: [] },
        { type: "tool-call", toolCallId: "research-1", toolName: "searchStories", input: '{"query":"technology"}' },
        { type: "finish", finishReason: { unified: "tool-calls", raw: undefined }, usage },
      ] }) },
      { stream: simulateReadableStream({ initialDelayInMs: null, chunkDelayInMs: null, chunks: [
        { type: "stream-start", warnings: [] }, { type: "text-start", id: "answer" },
        { type: "text-delta", id: "answer", delta: "Here are related Japan stories." }, { type: "text-end", id: "answer" },
        { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
      ] }) },
    ] });
    const article = { id: "123", title: "Selected Japan article", url: "https://example.com", discussionUrl: "https://news.ycombinator.com/item?id=123", text: "Article submission", comments: ["HN discussion"] };
    const response = await createAlignedChatResponse(model, { stage: "request", article, messages: [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Explain the selected article" }] },
      { id: "a1", role: "assistant", parts: [{ type: "text", text: "We discussed technology in Japan." }] },
      { id: "u2", role: "user", parts: [{ type: "text", text: "Find more sources on that topic" }] },
    ] }, new AbortController().signal);
    const stream = await response.text();
    expect(stream).toContain('"type":"tool-output-available"');
    expect(stream).toContain("https://www.example.com/post");
    expect(stream).toContain("Here are related Japan stories.");
    expect(stream).not.toContain('"type":"error"');
    expect(model.doStreamCalls).toHaveLength(2);
    expect(model.doStreamCalls[0].maxOutputTokens).toBe(2000);
    expect(JSON.stringify(model.doStreamCalls[0].prompt)).toContain("Selected Japan article");
    expect(JSON.stringify(model.doStreamCalls[0].prompt)).toContain("We discussed technology in Japan.");
    expect(JSON.stringify(model.doStreamCalls[1].prompt)).toContain("https://www.example.com/post");
    expect(searchStories).toHaveBeenCalledOnce();
    expect(model.doGenerateCalls).toHaveLength(2);
    expect(model.doGenerateCalls[0].prompt[1]).toMatchObject({ role: "user", content: [{ type: "text", text: expect.stringContaining('"stage":"request"') }] });
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain("Here are related Japan stories.");
    expect(JSON.stringify(model.doGenerateCalls[1].prompt)).toContain("https://www.example.com/post");
  });
});
