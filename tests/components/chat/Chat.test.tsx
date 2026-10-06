import { createElement, type ReactNode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Chat } from "@/components/chat/Chat";
import type { ChatMessage } from "@/lib/chat/agent";
import { authUser } from "../../fixtures/stories";
vi.mock("@ai-sdk/react", () => ({ useChat: vi.fn() }));
vi.mock("ai", () => ({ DefaultChatTransport: vi.fn(function (options) { return options; }) }));
vi.mock("@/components/ai-elements/conversation", () => ({ Conversation: ({ children }: { children: ReactNode }) => createElement("div", { role: "log" }, children), ConversationContent: ({ children }: { children: ReactNode }) => createElement("div", null, children) }));
vi.mock("@/components/ai-elements/message", () => ({ Message: ({ children }: { children: ReactNode }) => createElement("div", null, children), MessageContent: ({ children }: { children: ReactNode }) => createElement("div", null, children), MessageResponse: ({ children, isAnimating, disallowedElements }: { children: ReactNode; isAnimating: boolean; disallowedElements: string[] }) => createElement("div", { "data-testid": "markdown", "data-animating": String(isAnimating), "data-disallowed": disallowedElements.join(",") }, children) }));
vi.mock("@/app/auth/actions", () => import("../../helpers/mockNext").then((m) => m.authActionsMock()));
const state = { messages: [] as ChatMessage[], status: "ready", error: undefined as Error | undefined, sendMessage: vi.fn(), stop: vi.fn(), regenerate: vi.fn(), setMessages: vi.fn(), clearError: vi.fn() };
const article = { id: "123", title: "Japan article", url: "https://example.com", discussionUrl: "https://news.ycombinator.com/item?id=123", text: "", comments: [] };
beforeEach(() => { state.messages = []; state.status = "ready"; state.error = undefined; vi.mocked(useChat).mockReturnValue(state as unknown as ReturnType<typeof useChat>); });
const display = (selectedArticle: typeof article | null = null, configured = true) => render(<Chat article={selectedArticle} user={authUser} configured={configured} />);
const textMessage = (role: "user" | "assistant", text: string): ChatMessage => ({ id: role, role, parts: [{ type: "text", text }] });
describe("chat interface", () => {
  it("prevents native form navigation", () => {
    display(); const event = new Event("submit", { bubbles: true, cancelable: true });
    fireEvent(screen.getByRole("textbox").closest("form")!, event); expect(event.defaultPrevented).toBe(true);
  });
  it.each(["ready", "streaming"])("animates only while streaming (%s)", (status) => {
    state.status = status; state.messages = [textMessage("assistant", "answer")]; display();
    expect(screen.getByTestId("markdown")).toHaveAttribute("data-animating", String(status === "streaming"));
    expect(screen.getByTestId("markdown")).toHaveAttribute("data-disallowed", "img");
  });
  it.each(["input-streaming", "output-error"])("distinguishes research progress from failure (%s)", (toolState) => {
    const part = toolState === "input-streaming" ? { type: "tool-searchStories", toolCallId: "1", state: "input-streaming" } : { type: "tool-searchStories", toolCallId: "1", state: "output-error", input: { query: "Japan" }, errorText: "private" };
    state.messages = [{ id: "a", role: "assistant", parts: [part as ChatMessage["parts"][number]] }]; display();
    expect(screen.getByText(toolState === "input-streaming" ? "Searching Hacker News…" : "Source search failed. Try asking again.")).toBeInTheDocument();
    expect(screen.queryByText(toolState === "input-streaming" ? "Source search failed. Try asking again." : "Searching Hacker News…")).not.toBeInTheDocument();
  });
  it("refreshes the request context when the selected article changes", () => {
    const { rerender } = display(article);
    rerender(<Chat article={{ ...article, id: "456" }} user={authUser} configured />);
    expect(DefaultChatTransport).toHaveBeenCalledTimes(2);
    const options = vi.mocked(DefaultChatTransport).mock.calls[1][0]!;
    const request = options.prepareSendMessagesRequest!({ messages: [textMessage("user", "question")], id: "chat", requestMetadata: undefined, body: undefined, credentials: undefined, headers: undefined, api: "/api/chat", trigger: "submit-message", messageId: undefined });
    expect(request).toMatchObject({ body: { storyId: "456" } });
  });
  it("sends trimmed questions and clears the composer", async () => {
    display(); expect(useChat).toHaveBeenCalledWith({ transport: expect.objectContaining({ api: "/api/chat" }) }); const user = userEvent.setup(); await user.type(screen.getByRole("textbox"), "  Explain Japan  "); await user.click(screen.getByRole("button", { name: "Send message" }));
    expect(state.sendMessage).toHaveBeenCalledWith({ text: "Explain Japan" }); expect(state.clearError).toHaveBeenCalled(); expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByRole("link", { name: "Back to search" })).toHaveAttribute("href", "/");
  });
  it("supports suggested questions with and without an article", async () => {
    const { unmount } = display(); expect(screen.getByRole("button", { name: "Find recent discussions about Japan on Hacker News." })).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "What is changing in Japan’s technology industry?" })); expect(state.sendMessage).toHaveBeenCalledWith({ text: "What is changing in Japan’s technology industry?" });
    unmount(); display(article); expect(screen.getByRole("button", { name: "Explain the key ideas in this story." })).toBeInTheDocument(); await userEvent.click(screen.getByRole("button", { name: "Find related stories and sources." })); expect(state.sendMessage).toHaveBeenCalledWith({ text: "Find related stories and sources." });
    expect(screen.getByRole("link", { name: "Japan article" })).toHaveAttribute("href", article.url); expect(screen.getByRole("link", { name: "Ask a general question" })).toHaveAttribute("href", "/chat");
  });
  it("does not submit empty input or when unavailable", () => {
    const { unmount } = display(); expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled(); expect(screen.getByRole("button", { name: "New chat" })).toBeDisabled(); fireEvent.change(screen.getByRole("textbox"), { target: { value: "   " } }); expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled(); fireEvent.submit(screen.getByRole("textbox").closest("form")!); expect(state.sendMessage).not.toHaveBeenCalled(); unmount();
    display(null, false); fireEvent.change(screen.getByRole("textbox"), { target: { value: "question" } }); fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    expect(state.sendMessage).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: "Send message" })).toBeDisabled(); expect(screen.getByRole("alert")).toHaveTextContent("AI chat is not available yet."); expect(screen.getByRole("textbox")).toBeDisabled();
  });
  it.each(["submitted", "streaming"])("disables duplicate requests and stops a %s response", async (status) => {
    state.status = status; state.messages = [textMessage("user", "question")]; display(); fireEvent.change(screen.getByRole("textbox"), { target: { value: "duplicate" } }); fireEvent.submit(screen.getByRole("textbox").closest("form")!);
    expect(state.sendMessage).not.toHaveBeenCalled(); expect(screen.getByRole("status")).toHaveTextContent(status === "submitted" ? "Thinking…" : "Responding…");
    await userEvent.click(screen.getByRole("button", { name: "Stop response" })); expect(state.stop).toHaveBeenCalled(); expect(screen.getByRole("button", { name: "New chat" })).toBeDisabled();
  });
  it("renders user text safely and assistant text through the markdown component", () => {
    state.messages = [textMessage("user", "<script>question</script>"), textMessage("assistant", "**answer**")]; display();
    expect(screen.getByText("You", { exact: true })).toBeInTheDocument(); expect(screen.getByText("Japan AI", { exact: true })).toBeInTheDocument(); expect(screen.queryByText("What would you like to explore?")).not.toBeInTheDocument(); expect(screen.getByText("<script>question</script>")).toBeInTheDocument(); expect(document.querySelector("script")).toBeNull(); expect(screen.getByTestId("markdown")).toHaveTextContent("**answer**");
    const questionBubble = screen.getByText("<script>question</script>").parentElement!.parentElement!;
    expect(within(questionBubble).getByText("You", { exact: true })).toBeInTheDocument();
    expect(within(questionBubble).queryByText("Japan AI", { exact: true })).not.toBeInTheDocument();
  });
  it("renders source links, search progress, failures, and ignores non-display parts", () => {
    state.messages = [{ id: "a", role: "assistant", parts: [
      { type: "step-start" }, { type: "reasoning", text: "private" },
      { type: "tool-searchStories", toolCallId: "1", state: "output-available", input: { query: "Japan" }, output: [{ title: "Related story", url: "https://example.com/related", discussionUrl: "https://news.ycombinator.com/item?id=1", publishedAt: "2026-01-01" }] },
      { type: "tool-searchStories", toolCallId: "2", state: "input-streaming" },
      { type: "tool-searchStories", toolCallId: "3", state: "output-error", input: { query: "Japan" }, errorText: "secret" },
    ] }]; display();
    expect(screen.getByRole("link", { name: "Related story" })).toHaveAttribute("href", "https://example.com/related"); expect(screen.getByText("Searching Hacker News…")).toBeInTheDocument(); expect(screen.getByText("Source search failed. Try asking again.")).toBeInTheDocument(); expect(screen.queryByText("private")).not.toBeInTheDocument(); expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });
  it("offers retry and starts a fresh conversation", async () => {
    state.messages = [textMessage("user", "question")]; state.error = new Error("private provider details"); display();
    expect(screen.getByRole("alert")).not.toHaveTextContent("private provider details"); await userEvent.click(screen.getByRole("button", { name: "Retry response" })); expect(state.regenerate).toHaveBeenCalled();
    await userEvent.type(screen.getByRole("textbox"), "draft"); await userEvent.click(screen.getByRole("button", { name: "New chat" })); expect(state.setMessages).toHaveBeenCalledWith([]); expect(state.clearError).toHaveBeenCalled(); expect(screen.getByRole("textbox")).toHaveValue("");
  });
  it.each([null, article])("transports only text history and the selected article id (%s)", (selectedArticle) => {
    display(selectedArticle);
    const options = vi.mocked(DefaultChatTransport).mock.calls[0][0]!;
    const request = options.prepareSendMessagesRequest!({ messages: [textMessage("user", "question"), { id: "a", role: "assistant", parts: [{ type: "step-start" }, { type: "reasoning", text: "private reasoning" }, { type: "text", text: "first " }, { type: "text", text: "second" }] }, { id: "empty", role: "assistant", parts: [{ type: "step-start" }] }, { id: "whitespace", role: "assistant", parts: [{ type: "text", text: "   " }] }], id: "chat", requestMetadata: undefined, body: undefined, credentials: undefined, headers: undefined, api: "/api/chat", trigger: "submit-message", messageId: undefined });
    expect(request).toEqual({ body: { ...(selectedArticle ? { storyId: "123" } : {}), messages: [{ id: "user", role: "user", parts: [{ type: "text", text: "question" }] }, { id: "a", role: "assistant", parts: [{ type: "text", text: "first second" }] }] } });
    expect(options.api).toBe("/api/chat");
  });
});
