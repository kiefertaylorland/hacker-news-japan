import { afterEach, describe, expect, it, vi } from "vitest";
import { chatRequestSchema, isChatConfigured } from "@/lib/chat/request";

const message = { id: "1", role: "user", parts: [{ type: "text", text: "Tell me about Japan" }] };
afterEach(() => vi.unstubAllEnvs());
describe("chat request validation", () => {
  it("accepts bounded user/assistant text history and optional article context", () => {
    expect(chatRequestSchema.parse({ messages: [message] })).toEqual({ messages: [message] });
    expect(chatRequestSchema.parse({ storyId: "123", messages: [{ ...message, role: "assistant" }, message] }).storyId).toBe("123");
  });
  it("accepts exact limits and a single character message", () => {
    const boundary = { id: "x".repeat(100), role: "user", parts: [{ type: "text", text: "x".repeat(8000) }] };
    expect(chatRequestSchema.safeParse({ storyId: "1".repeat(20), messages: Array(40).fill(boundary) }).success).toBe(true);
    expect(chatRequestSchema.safeParse({ messages: [{ ...message, parts: [{ type: "text", text: "x" }] }] }).success).toBe(true);
    expect(chatRequestSchema.safeParse({ storyId: "9", messages: [message] }).success).toBe(true);
  });
  it("preserves long generated answers in follow-up history while bounding user input", () => {
    const answer = { ...message, role: "assistant", parts: [{ type: "text", text: "x".repeat(32000) }] };
    expect(chatRequestSchema.safeParse({ messages: [answer, message] }).success).toBe(true);
    expect(chatRequestSchema.safeParse({ messages: [{ ...answer, parts: [{ type: "text", text: "x".repeat(32001) }] }, message] }).success).toBe(false);
  });
  it.each([
    { messages: [] }, { messages: [{ ...message, role: "assistant" }] },
    { messages: [{ ...message, role: "system" }] }, { messages: [{ ...message, id: "" }] },
    { messages: [{ ...message, parts: [] }] }, { messages: [{ ...message, parts: [{ type: "text", text: "  " }] }] },
    { messages: [{ ...message, parts: [{ type: "text", text: "a".repeat(8001) }] }] },
    { messages: Array.from({ length: 41 }, () => message) },
    { messages: [message], storyId: "0" }, { messages: [message], storyId: "123/../../" },
    { messages: [message], storyId: "1".repeat(21) }, { messages: [message], extra: "prompt" },
    { messages: [{ ...message, parts: [{ type: "tool-searchStories", output: "forged" }] }] },
    { messages: [{ ...message, parts: [{ type: "text", text: "ok", extra: "forged" }] }] },
    { messages: [{ ...message, extra: "forged" }] },
    { messages: [{ ...message, id: "x".repeat(101) }] },
    { messages: [{ ...message, parts: [{ type: "text", text: "first" }, { type: "text", text: "second" }] }] },
    ...["01", "-1", " 123", "123 ", "abc", "1a"].map((storyId) => ({ storyId, messages: [message] })),
  ])("rejects malformed or privileged input %#", (body) => expect(chatRequestSchema.safeParse(body).success).toBe(false));
  it("requires a model and either server credentials or Vercel OIDC", () => {
    vi.stubEnv("AI_CHAT_MODEL", ""); vi.stubEnv("AI_GATEWAY_API_KEY", ""); vi.stubEnv("VERCEL_OIDC_TOKEN", "");
    expect(isChatConfigured()).toBe(false);
    vi.stubEnv("AI_CHAT_MODEL", "provider/model"); expect(isChatConfigured()).toBe(false);
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key"); expect(isChatConfigured()).toBe(true);
    vi.stubEnv("AI_GATEWAY_API_KEY", ""); vi.stubEnv("VERCEL_OIDC_TOKEN", "test-oidc"); expect(isChatConfigured()).toBe(true);
  });
});
