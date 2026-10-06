import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatPage from "@/app/chat/page";
import { getCurrentUser } from "@/lib/auth/user";
import { getArticleContext } from "@/lib/chat/context";
import { isChatConfigured } from "@/lib/chat/request";
import { authUser } from "../fixtures/stories";
import { renderServerPage } from "../helpers/renderServerPage";
const chatMock = vi.fn(({ article, configured }: { article: { title: string } | null; configured: boolean }) => createElement("div", null, article?.title ?? "General chat", configured ? "Configured" : "Unavailable"));
vi.mock("@/components/chat/Chat", () => ({ Chat: (props: never) => chatMock(props) }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/chat/context", () => ({ getArticleContext: vi.fn() }));
vi.mock("@/lib/chat/request", () => ({ isChatConfigured: vi.fn() }));
vi.mock("@/app/auth/actions", () => import("../helpers/mockNext").then((m) => m.authActionsMock()));
const page = (story?: string | string[]) => ChatPage({ searchParams: Promise.resolve({ story }) });
beforeEach(() => {
  vi.mocked(getCurrentUser).mockResolvedValue(authUser); vi.mocked(isChatConfigured).mockReturnValue(true);
  vi.mocked(getArticleContext).mockResolvedValue({ id: "123", title: "Japan article", url: "https://example.com", discussionUrl: "https://news.ycombinator.com/item?id=123", text: "", comments: [] });
});
describe("chat page", () => {
  it("renders its loading shell", () => { render(page().props.fallback); expect(screen.getByRole("status")).toHaveTextContent("Loading chat"); });
  it.each([undefined, "123"])("prompts signed-out visitors with a return path (%s)", async (story) => {
    vi.mocked(getCurrentUser).mockResolvedValue(null); await renderServerPage(page(story));
    expect(screen.getByText("Discuss Japan with AI")).toBeInTheDocument();
    expect(document.querySelector('input[name="next"]')).toHaveValue(story ? "/chat?story=123" : "/chat");
    expect(getArticleContext).not.toHaveBeenCalled();
  });
  it("renders general chat with availability state", async () => {
    vi.mocked(isChatConfigured).mockReturnValue(false); await renderServerPage(page());
    expect(screen.getByText("General chatUnavailable")).toBeInTheDocument();
    expect(chatMock).toHaveBeenCalledWith(expect.objectContaining({ article: null, user: authUser, configured: false }));
  });
  it("loads article context for signed-in users", async () => {
    await renderServerPage(page("123")); expect(screen.getByText("Japan articleConfigured")).toBeInTheDocument(); expect(getArticleContext).toHaveBeenCalledWith("123");
  });
  it.each(["0", "../", "", "-123", "123abc", ["123"], ["123", "456"]])("offers a general chat for invalid story input %s", async (story) => {
    await renderServerPage(page(story)); expect(screen.getByRole("alert")).toHaveTextContent("Could not load the selected article."); expect(screen.getByRole("link", { name: "Start a general chat" })).toHaveAttribute("href", "/chat"); expect(getArticleContext).not.toHaveBeenCalled();
  });
  it.each([false, true])("handles missing or unavailable articles (%s)", async (outage) => {
    if (outage) vi.mocked(getArticleContext).mockRejectedValue(new Error("offline")); else vi.mocked(getArticleContext).mockResolvedValue(null);
    await renderServerPage(page("123")); expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
