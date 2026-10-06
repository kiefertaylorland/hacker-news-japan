import { getCurrentUser } from "@/lib/auth/user";
import { createAlignedChatResponse } from "@/lib/chat/response";
import { getArticleContext } from "@/lib/chat/context";
import { chatRequestSchema, isChatConfigured } from "@/lib/chat/request";
import { consumeChatQuota } from "@/lib/chat/quota";

export const maxDuration = 60;
const headers = { "Cache-Control": "private, no-store" };
const unavailable = "AI chat is unavailable. Please try again later.";

async function readBody(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      body += decoder.decode(value, { stream: !done });
      if (body.length > 64000) {
        await reader.cancel();
        return null;
      }
      if (done) return body;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Invalid request origin." }, { status: 403, headers });
  if (request.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    return Response.json({ error: "Expected a JSON request." }, { status: 415, headers });
  let input;
  try {
    // Stop reading oversized bodies before parsing or contacting the model.
    const body = await readBody(request);
    if (body === null) return Response.json(
      { error: "Conversation is too long. Start a new chat." }, { status: 413, headers },
    );
    input = chatRequestSchema.parse(JSON.parse(body));
  } catch {
    return Response.json(
      { error: "Invalid chat request." },
      { status: 400, headers },
    );
  }
  try {
    if (!(await getCurrentUser()))
      return Response.json(
        { error: "Sign in to use AI chat." },
        { status: 401, headers },
      );
    if (!isChatConfigured())
      return Response.json({ error: unavailable }, { status: 503, headers });
    const abortSignal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(55000),
    ]);
    if (!(await consumeChatQuota(abortSignal)))
      return Response.json(
        { error: "Chat request limit reached. Please try again later." },
        { status: 429, headers: { ...headers, "Retry-After": "60" } },
      );
    const article = input.storyId
      ? await getArticleContext(input.storyId, abortSignal)
      : null;
    if (input.storyId && !article)
      return Response.json(
        { error: "Article not found." },
        { status: 404, headers },
      );
    return await createAlignedChatResponse(
      process.env.AI_CHAT_MODEL as string,
      { stage: "request", messages: input.messages, article },
      abortSignal,
    );
  } catch {
    return Response.json({ error: unavailable }, { status: 503, headers });
  }
}
