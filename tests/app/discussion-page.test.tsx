import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DiscussionPage from "@/app/stories/[id]/page";
import { getDiscussion } from "@/lib/comments/algolia";
import { listComments } from "@/lib/comments/queries";
import { listCommentReactions } from "@/lib/comments/reactions";
import { getCurrentUser } from "@/lib/auth/user";
import { authUser, sampleStory } from "../fixtures/stories";
import { renderServerPage } from "../helpers/renderServerPage";
vi.mock("@/lib/comments/algolia", () => ({ getDiscussion: vi.fn() }));
vi.mock("@/lib/comments/queries", () => ({ listComments: vi.fn() }));
vi.mock("@/lib/comments/reactions", () => ({ listCommentReactions: vi.fn() }));
vi.mock("@/lib/comments/reaction-actions", () => ({ upvoteComment: vi.fn(), setCommentFavorite: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/app/auth/actions", () => import("../helpers/mockNext").then((m) => m.authActionsMock()));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
beforeEach(() => {
  vi.mocked(getDiscussion).mockResolvedValue({ id: 123, type: "story", title: "Japan discussion", children: [] });
  vi.mocked(listComments).mockResolvedValue([]); vi.mocked(getCurrentUser).mockResolvedValue(null);
  vi.mocked(listCommentReactions).mockResolvedValue({ upvoted: [], favorited: [] });
});
const page = () => DiscussionPage({ params: Promise.resolve({ id: "123" }) });
describe("discussion page", () => {
  it("renders a loading shell and an anonymous discussion with sign-in", async () => {
    render(page().props.fallback); expect(screen.getByRole("status")).toHaveTextContent("Loading discussion");
    await renderServerPage(page()); expect(screen.getByRole("heading", { name: "Japan discussion" })).toBeInTheDocument();
    expect(screen.getByText("No comments yet.")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument(); expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(document.querySelector('input[name="next"]')).toHaveValue("/stories/123");
    expect(screen.getByRole("link", { name: "Discuss with AI" })).toHaveAttribute("href", "/chat?story=123");
  });
  it("shows the form and local comments as escaped text", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(authUser);
    vi.mocked(listComments).mockResolvedValue([{ id: "local-1", author: "Local author", body: "<script>hello</script>", created_at: sampleStory.created_at }]);
    await renderServerPage(page()); expect(screen.getByRole("textbox", { name: "Comment" })).toBeInTheDocument(); expect(screen.getByText("<script>hello</script>")).toBeInTheDocument(); expect(screen.getByText("Local author")).toBeInTheDocument();
    expect(screen.queryByText("No comments yet.")).not.toBeInTheDocument();
  });
  it("lets signed-in readers upvote and favorite local comments with their saved state", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(authUser);
    vi.mocked(listComments).mockResolvedValue([
      { id: "local-1", author: "First", body: "One", created_at: sampleStory.created_at },
      { id: "local-2", author: "Second", body: "Two", created_at: sampleStory.created_at },
    ]);
    vi.mocked(listCommentReactions).mockResolvedValue({ upvoted: ["local-1"], favorited: ["local-2"] });
    await renderServerPage(page());
    expect(listCommentReactions).toHaveBeenCalledWith(authUser.id, ["local-1", "local-2"]);
    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByRole("button", { name: "Upvoted comment" })).toHaveAttribute("aria-pressed", "true");
    expect(within(first).getByRole("button", { name: "favorite" })).toHaveAttribute("aria-pressed", "false");
    expect(within(second).getByRole("button", { name: "Upvote comment" })).toHaveAttribute("aria-pressed", "false");
    expect(within(second).getByRole("button", { name: "un-favorite" })).toHaveAttribute("aria-pressed", "true");
    expect(within(first).getByText("First").parentElement).toHaveTextContent(/^First · .+ ago · Hacker News Japan · favorite$/);
  });
  it("hides comment reactions from anonymous readers", async () => {
    vi.mocked(listComments).mockResolvedValue([{ id: "local-1", author: "First", body: "One", created_at: sampleStory.created_at }]);
    await renderServerPage(page());
    expect(listCommentReactions).toHaveBeenCalledWith(null, ["local-1"]);
    expect(screen.queryByRole("button", { name: "Upvote comment" })).not.toBeInTheDocument();
  });
  it("renders HN comments without an empty-state message", async () => {
    vi.mocked(getDiscussion).mockResolvedValue({ id: 123, type: "story", title: "Japan", children: [{ id: 1, author: "HN author", text: "HN comment", created_at: sampleStory.created_at, children: [] }] });
    await renderServerPage(page()); expect(screen.getByText("HN comment")).toBeInTheDocument(); expect(screen.queryByText("No comments yet.")).not.toBeInTheDocument();
  });
  it("returns not found for missing stories", async () => {
    vi.mocked(getDiscussion).mockResolvedValue(null); await expect(renderServerPage(page())).rejects.toThrow("NOT_FOUND");
  });
  it("offers retry guidance for upstream or local database outages", async () => {
    vi.mocked(getDiscussion).mockRejectedValue(new Error("offline")); await renderServerPage(page()); expect(screen.getByRole("alert")).toHaveTextContent("Could not load discussion. Please try again.");
  });
  it("offers retry guidance when comment reactions fail to load", async () => {
    vi.mocked(listCommentReactions).mockRejectedValue(new Error("offline")); await renderServerPage(page()); expect(screen.getByRole("alert")).toHaveTextContent("Could not load discussion. Please try again.");
    expect(screen.getByRole("link", { name: "Retry" })).toHaveAttribute("href", "/stories/123");
  });
});
