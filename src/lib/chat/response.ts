import {
  createAgentUIStream,
  createUIMessageStreamResponse,
  type LanguageModel,
  type UIMessageChunk,
} from "ai";
import { createChatAgent } from "./agent";
import { isTopicAligned, topicRefusal } from "./alignment";

function respond(chunks: UIMessageChunk[]) {
  return createUIMessageStreamResponse({
    headers: { "Cache-Control": "private, no-store" },
    stream: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    }),
  });
}

function refuse() {
  return respond([
    { type: "start" },
    { type: "text-start", id: "topic-refusal" },
    { type: "text-delta", id: "topic-refusal", delta: topicRefusal },
    { type: "text-end", id: "topic-refusal" },
    { type: "finish", finishReason: "stop" },
  ]);
}

export async function createAlignedChatResponse(
  model: LanguageModel,
  input: Parameters<typeof isTopicAligned>[1],
  abortSignal: AbortSignal,
) {
  abortSignal.throwIfAborted();
  const requestAllowed = await isTopicAligned(model, input, abortSignal);
  abortSignal.throwIfAborted();
  if (!requestAllowed) return refuse();
  const stream = await createAgentUIStream({
    agent: createChatAgent(model, input.article),
    uiMessages: input.messages,
    abortSignal,
    sendReasoning: false,
    onError: () => "AI chat is unavailable. Please try again later.",
  });

  // Withhold every chunk, including research results, until the complete output passes.
  const chunks: UIMessageChunk[] = [];
  let text = "";
  let finished = false;
  for await (const chunk of stream) {
    abortSignal.throwIfAborted();
    if (chunk.type === "error" || chunk.type === "abort" ||
      (chunk.type === "finish" && chunk.finishReason === "error"))
      throw new Error("Chat generation failed.");
    if (chunk.type === "text-delta") text += chunk.delta;
    if (chunk.type === "finish") finished = true;
    // SDK tool errors may contain upstream internals; never release their raw text.
    chunks.push(chunk.type === "tool-output-error"
      ? { ...chunk, errorText: "Source search failed. Try asking again." }
      : chunk);
  }
  if (!finished || !text.trim()) throw new Error("Incomplete chat response.");
  const allowed = await isTopicAligned(
    model,
    { ...input, stage: "response", response: chunks },
    abortSignal,
  );
  abortSignal.throwIfAborted();
  return allowed ? respond(chunks) : refuse();
}
