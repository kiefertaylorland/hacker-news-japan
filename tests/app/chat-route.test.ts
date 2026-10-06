import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST, maxDuration } from "@/app/api/chat/route";
import { getCurrentUser } from "@/lib/auth/user";
import { getArticleContext } from "@/lib/chat/context";
import { createAlignedChatResponse } from "@/lib/chat/response";
import { isChatConfigured } from "@/lib/chat/request";
import { authUser } from "../fixtures/stories";
import { consumeChatQuota } from "@/lib/chat/quota";
vi.mock("@/lib/chat/quota", () => ({ consumeChatQuota: vi.fn() }));
vi.mock("@/lib/chat/response", () => ({ createAlignedChatResponse: vi.fn() }));
vi.mock("@/lib/chat/context", () => ({ getArticleContext: vi.fn() }));
vi.mock("@/lib/chat/request", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/chat/request")>(), isChatConfigured: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
const messages = [{ id: "1", role: "user", parts: [{ type: "text", text: "Tell me about Japan" }] }];
const article = { id: "123", title: "Japan", url: "https://example.com", discussionUrl: "https://news.ycombinator.com/item?id=123", text: "", comments: [] };
const jsonHeaders = { "Content-Type": "application/json" };
const request = (body: unknown = { messages }) => new Request("https://example.com/api/chat", { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) });
beforeEach(() => {
  vi.mocked(consumeChatQuota).mockResolvedValue(true);
  vi.mocked(getCurrentUser).mockResolvedValue(authUser); vi.mocked(isChatConfigured).mockReturnValue(true);
  vi.mocked(getArticleContext).mockResolvedValue(article);
  vi.mocked(createAlignedChatResponse).mockResolvedValue(new Response("stream", { headers: { "Cache-Control": "private, no-store" } }));
  vi.stubEnv("AI_CHAT_MODEL", "provider/model");
});
describe("chat route", () => {
  it.each(["https://evil.example", "https://sub.example.com", "null"])("blocks cross-origin requests from %s", async (origin) => {
    const response = await POST(new Request("https://example.com/api/chat", { method: "POST", headers: { ...jsonHeaders, Origin: origin }, body: JSON.stringify({ messages }) }));
    expect(response.status).toBe(403);
    expect(getCurrentUser).not.toHaveBeenCalled(); expect(consumeChatQuota).not.toHaveBeenCalled(); expect(createAlignedChatResponse).not.toHaveBeenCalled();
  });
  it("accepts same-origin JSON with a charset", async () => {
    const response = await POST(new Request("https://example.com/api/chat", { method: "POST", headers: { Origin: "https://example.com", "Content-Type": "application/json; charset=utf-8" }, body: JSON.stringify({ messages }) }));
    expect(response.status).toBe(200);
  });
  it.each([undefined, "text/plain", "application/x-www-form-urlencoded"])("blocks non-JSON requests (%s)", async (type) => {
    const response = await POST(new Request("https://example.com/api/chat", { method: "POST", headers: type ? { "Content-Type": type } : {}, body: new TextEncoder().encode(JSON.stringify({ messages })) }));
    expect(response.status).toBe(415); expect(getCurrentUser).not.toHaveBeenCalled(); expect(createAlignedChatResponse).not.toHaveBeenCalled();
  });
  it("stops reading and cancels an oversized chunked body", async () => {
    const cancel = vi.fn(); const pull = vi.fn((controller: ReadableStreamDefaultController<Uint8Array>) => controller.enqueue(new TextEncoder().encode("a".repeat(32001))));
    const body = new ReadableStream({ pull, cancel }, { highWaterMark: 0 });
    const response = await POST(new Request("https://example.com/api/chat", { method: "POST", headers: jsonHeaders, body, duplex: "half" } as RequestInit));
    expect(response.status).toBe(413); expect(pull).toHaveBeenCalledTimes(2); expect(cancel).toHaveBeenCalledOnce(); expect(body.locked).toBe(false);
    expect(getCurrentUser).not.toHaveBeenCalled(); expect(createAlignedChatResponse).not.toHaveBeenCalled();
  });
  it("preserves Japanese characters split across UTF-8 chunks", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ messages: [{ ...messages[0], parts: [{ type: "text", text: "日本" }] }] }));
    const body = new ReadableStream({ start(controller) { for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); controller.close(); } });
    expect((await POST(new Request("https://example.com/api/chat", { method: "POST", headers: jsonHeaders, body, duplex: "half" } as RequestInit))).status).toBe(200);
    expect(vi.mocked(createAlignedChatResponse).mock.calls[0][1].messages[0].parts[0].text).toBe("日本");
  });
  it("handles empty and failed request streams", async () => {
    expect((await POST(new Request("https://example.com/api/chat", { method: "POST", headers: jsonHeaders }))).status).toBe(400);
    const body = new ReadableStream({ start(controller) { controller.error(new Error("private")); } });
    const response = await POST(new Request("https://example.com/api/chat", { method: "POST", headers: jsonHeaders, body, duplex: "half" } as RequestInit));
    expect(response.status).toBe(400); expect(await response.text()).not.toContain("private"); expect(body.locked).toBe(false);
  });
  it("denies quota exhaustion before context, generation, or research", async () => {
    vi.mocked(consumeChatQuota).mockResolvedValue(false);
    const response = await POST(request({ messages, storyId: "123" }));
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("60");
    expect(getArticleContext).not.toHaveBeenCalled(); expect(createAlignedChatResponse).not.toHaveBeenCalled();
  });
  it("fails closed when the quota service is unavailable", async () => {
    vi.mocked(consumeChatQuota).mockRejectedValue(new Error("private"));
    const response = await POST(request()); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private");
    expect(createAlignedChatResponse).not.toHaveBeenCalled();
  });
  it.each([{ messages: [] }, { messages: [{ ...messages[0], role: "system" }] }, { messages, storyId: "../" }])("rejects invalid input before contacting AI", async (body) => {
    const response = await POST(request(body)); expect(response.status).toBe(400); expect(await response.json()).toEqual({ error: "Invalid chat request." }); expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(createAlignedChatResponse).not.toHaveBeenCalled();
  });
  it("rejects non-JSON and excessive bodies", async () => {
    expect((await POST(new Request("https://example.com", { method: "POST", headers: jsonHeaders, body: "{" }))).status).toBe(400);
    const response = await POST(new Request("https://example.com", { method: "POST", headers: jsonHeaders, body: "a".repeat(64001) })); expect(response.status).toBe(413); expect(await response.json()).toEqual({ error: "Conversation is too long. Start a new chat." });
  });
  it("allows a request at the total character limit", async () => {
    const body = JSON.stringify({ messages }).padEnd(64000, " ");
    expect((await POST(new Request("https://example.com/api/chat", { method: "POST", headers: jsonHeaders, body }))).status).toBe(200);
  });
  it("requires an authenticated user", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null); const response = await POST(request()); expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: "Sign in to use AI chat." }); expect(createAlignedChatResponse).not.toHaveBeenCalled();
  });
  it("handles missing configuration", async () => {
    vi.mocked(isChatConfigured).mockReturnValue(false); const response = await POST(request()); expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "AI chat is unavailable. Please try again later." }); expect(createAlignedChatResponse).not.toHaveBeenCalled();
  });
  it("streams general chat with cancellation and private caching", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const req = request(); const response = await POST(req);
    expect(timeout).toHaveBeenCalledWith(55000);
    expect(await response.text()).toBe("stream"); expect(getArticleContext).not.toHaveBeenCalled();
    const [model, input, signal] = vi.mocked(createAlignedChatResponse).mock.calls[0];
    expect(model).toBe("provider/model");
    expect(input).toEqual({ stage: "request", messages, article: null });
    expect(signal.aborted).toBe(false);
    expect(maxDuration).toBe(60);
  });
  it("cancels the entire alignment workflow when the client disconnects", async () => {
    const controller = new AbortController();
    await POST(new Request("https://example.com/api/chat", { method: "POST", headers: jsonHeaders, body: JSON.stringify({ messages }), signal: controller.signal }));
    const signal = vi.mocked(createAlignedChatResponse).mock.calls[0][2];
    expect(signal.aborted).toBe(false); controller.abort(); expect(signal.aborted).toBe(true);
  });
  it("fetches article context on the server", async () => {
    expect((await POST(request({ messages, storyId: "123" }))).status).toBe(200);
    expect(getArticleContext).toHaveBeenCalledWith("123", expect.any(AbortSignal)); expect(createAlignedChatResponse).toHaveBeenCalledWith("provider/model", { stage: "request", messages, article }, expect.any(AbortSignal));
  });
  it("rejects missing articles", async () => {
    vi.mocked(getArticleContext).mockResolvedValue(null); const response = await POST(request({ messages, storyId: "123" })); expect(response.status).toBe(404); expect(await response.json()).toEqual({ error: "Article not found." }); expect(createAlignedChatResponse).not.toHaveBeenCalled();
  });
  it.each(["auth", "context", "provider"])("returns a generic error for %s failures", async (failure) => {
    const error = new Error("private credential");
    if (failure === "auth") vi.mocked(getCurrentUser).mockRejectedValue(error);
    if (failure === "context") vi.mocked(getArticleContext).mockRejectedValue(error);
    if (failure === "provider") vi.mocked(createAlignedChatResponse).mockRejectedValue(error);
    const response = await POST(request({ messages, storyId: "123" }));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "AI chat is unavailable. Please try again later." });
  });
});
