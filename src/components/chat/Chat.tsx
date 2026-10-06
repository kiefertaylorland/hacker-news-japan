"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { ChatMessage } from "@/lib/chat/agent";
import type { getArticleContext } from "@/lib/chat/context";
import type { AuthUser } from "@/lib/auth/user";
import { UserMenu } from "@/components/auth/UserMenu";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/layout/ErrorAlert";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

interface Props {
  article: Awaited<ReturnType<typeof getArticleContext>>;
  user: AuthUser;
  configured: boolean;
}

export function Chat({ article, user, configured }: Props) {
  const [input, setInput] = useState("");
  const transport = useMemo(
    () =>
      new DefaultChatTransport<ChatMessage>({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            ...(article ? { storyId: article.id } : {}),
            messages: messages
              .map((message) => ({
                id: message.id,
                role: message.role,
                parts: [
                  {
                    type: "text",
                    text: message.parts
                      .filter((part) => part.type === "text")
                      .map((part) => part.text)
                      .join(""),
                  },
                ],
              }))
              .filter((message) => message.parts[0].text.trim()),
          },
        }),
      }),
    [article],
  );
  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
    setMessages,
    clearError,
  } = useChat<ChatMessage>({ transport });
  const busy = status === "submitted" || status === "streaming";
  const prompts = article
    ? [
        "Explain the key ideas in this story.",
        "Find related stories and sources.",
      ]
    : [
        "What is changing in Japan’s technology industry?",
        "Find recent discussions about Japan on Hacker News.",
      ];
  const send = (text: string) => {
    if (!text.trim() || busy || !configured) return;
    clearError();
    void sendMessage({ text: text.trim() });
    setInput("");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-sm text-hn">
          Back to search
        </Link>
        <UserMenu user={user} />
      </div>
      <h1 className="text-3xl font-semibold">Japan AI chat</h1>
      <p className="text-sm text-slate-400">
        Discuss stories, explore related Hacker News sources, or ask about
        Japan. Conversations last until you leave this page.
      </p>
      {article && (
        <aside className="rounded-lg border border-white/10 p-4">
          <p className="mb-1 text-xs text-slate-400">Discussing</p>
          <a
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-hn"
          >
            {article.title}
          </a>
          <p className="mt-2 text-xs text-slate-400">
            Context includes the HN submission and discussion. Paste article
            excerpts for a closer reading.
          </p>
          <Link href="/chat" className="mt-2 inline-block text-sm underline">
            Ask a general question
          </Link>
        </aside>
      )}
      {!configured && (
        <ErrorAlert>
          AI chat is not available yet. Please try again later.
        </ErrorAlert>
      )}
      <Conversation
        className="h-[50vh] min-h-64 rounded-xl border border-white/10 bg-card"
        aria-label="Chat messages"
      >
        <ConversationContent>
          {messages.length === 0 && (
            <div className="space-y-3">
              <p>What would you like to explore?</p>
              {prompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  className="h-auto whitespace-normal text-left"
                  disabled={!configured}
                  onClick={() => send(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          )}
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <p className="text-xs text-slate-400">
                {message.role === "user" ? "You" : "Japan AI"}
              </p>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (part.type === "text")
                    return message.role === "user" ? (
                      <p
                        key={index}
                        className="whitespace-pre-wrap wrap-break-word"
                      >
                        {part.text}
                      </p>
                    ) : (
                      <MessageResponse
                        key={index}
                        disallowedElements={["img"]}
                        isAnimating={status === "streaming"}
                      >
                        {part.text}
                      </MessageResponse>
                    );
                  if (part.type === "tool-searchStories")
                    return (
                      <div
                        key={index}
                        className="space-y-2 text-xs text-slate-400"
                      >
                        {part.state === "output-available" ? (
                          <>
                            <p>Related sources</p>
                            {part.output.map((source) => (
                              <a
                                key={source.discussionUrl}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-hn underline"
                              >
                                {source.title}
                              </a>
                            ))}
                          </>
                        ) : (
                          <p>
                            {part.state === "output-error"
                              ? "Source search failed. Try asking again."
                              : "Searching Hacker News…"}
                          </p>
                        )}
                      </div>
                    );
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
          {busy && (
            <p role="status" className="text-sm text-slate-400">
              {status === "submitted" ? "Thinking…" : "Responding…"}
            </p>
          )}
        </ConversationContent>
      </Conversation>
      {error && (
        <ErrorAlert>
          Could not complete the response. Check your connection and sign-in,
          then try again.
          <Button
            variant="outline"
            onClick={() => {
              void regenerate();
            }}
          >
            Retry response
          </Button>
        </ErrorAlert>
      )}
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <label htmlFor="chat-input" className="text-sm font-medium">
          Your message
        </label>
        <textarea
          id="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={8000}
          rows={3}
          disabled={!configured || busy}
          placeholder="Ask about this story or Japan…"
          className="w-full rounded-lg border border-input bg-background p-3 text-sm focus-visible:outline-hn disabled:opacity-50"
        />
        <div className="flex gap-3">
          {busy ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void stop();
              }}
            >
              Stop response
            </Button>
          ) : (
            <Button type="submit" disabled={!configured || !input.trim()}>
              Send message
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            disabled={busy || messages.length === 0}
            onClick={() => {
              setMessages([]);
              clearError();
              setInput("");
            }}
          >
            New chat
          </Button>
        </div>
      </form>
    </div>
  );
}
