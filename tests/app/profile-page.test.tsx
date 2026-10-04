import { cleanup, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage, { metadata } from "@/app/profile/page";
import { getCurrentUser } from "@/lib/auth/user";
import { listBookmarks } from "@/lib/bookmarks/queries";
import { getAccountCreatedAt, listFavoriteComments, listUpvotedComments, listUpvotedStories } from "@/lib/profile/queries";
import { authUser, makeStory } from "../fixtures/stories";
import { renderServerPage } from "../helpers/renderServerPage";

vi.mock("@/app/auth/actions", () => import("../helpers/mockNext").then((m) => m.authActionsMock()));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/bookmarks/queries", () => ({ listBookmarks: vi.fn() }));
vi.mock("@/lib/profile/queries", () => ({
  getAccountCreatedAt: vi.fn(), listUpvotedStories: vi.fn(), listUpvotedComments: vi.fn(), listFavoriteComments: vi.fn(),
}));

const comment = { id: "c1", story_id: "456", author: "alice", body: "<b>Great</b> post", created_at: "2026-10-01T00:00:00.000Z" };
const page = (view?: string | string[]) => ProfilePage({ searchParams: Promise.resolve(view === undefined ? {} : { view }) });

beforeEach(() => {
  vi.mocked(getCurrentUser).mockResolvedValue(authUser);
  vi.mocked(getAccountCreatedAt).mockResolvedValue("2026-10-04T01:02:03Z");
  vi.mocked(listUpvotedStories).mockResolvedValue([makeStory({ objectID: "11", title: "Upvoted story", num_comments: 3 })]);
  vi.mocked(listBookmarks).mockResolvedValue([makeStory({ objectID: "12", title: "Favorite story", url: null, points: null, num_comments: null })]);
  vi.mocked(listUpvotedComments).mockResolvedValue([comment]);
  vi.mocked(listFavoriteComments).mockResolvedValue([{ ...comment, id: "c2", body: "Favorite comment" }]);
});

describe("profile page", () => {
  it("asks anonymous visitors to sign in", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    render(page().props.fallback); expect(screen.getByRole("status")).toHaveTextContent("Loading profile");
    await renderServerPage(page());
    expect(screen.getByText("Sign in to see your profile")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
    expect(getAccountCreatedAt).not.toHaveBeenCalled();
    expect(metadata.title).toContain("Profile");
  });

  it("shows the user name, creation date and timestamp, and private list links like HN", async () => {
    await renderServerPage(page());
    const table = screen.getByRole("table", { name: "Profile" });
    expect(within(table).getByRole("row", { name: "user: octocat" })).toBeInTheDocument();
    const created = within(table).getByRole("row", { name: /^created:/ });
    expect(within(created).getByText("October 4, 2026 at 1:02:03 AM UTC")).toHaveAttribute("dateTime", "2026-10-04T01:02:03Z");
    expect(within(table).getByRole("link", { name: "upvoted submissions" })).toHaveAttribute("href", "/profile?view=upvoted-submissions");
    expect(within(table).getByRole("link", { name: "favorite submissions" })).toHaveAttribute("href", "/profile?view=favorite-submissions");
    expect(within(table).getAllByRole("link", { name: "comments" }).map((link) => link.getAttribute("href")))
      .toEqual(["/profile?view=upvoted-comments", "/profile?view=favorite-comments"]);
    expect(within(table).getAllByRole("row").slice(2).map((row) => row.textContent)).toEqual([
      "upvoted submissions / comments (private)", "favorite submissions / comments (private)",
    ]);
    expect(within(table).getByRole("link", { name: "upvoted submissions" })).not.toHaveAttribute("aria-current");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(listUpvotedStories).not.toHaveBeenCalled();
  });

  it("lists upvoted submissions with discussion links", async () => {
    await renderServerPage(page("upvoted-submissions"));
    expect(listUpvotedStories).toHaveBeenCalledWith(authUser.id);
    expect(screen.getByRole("link", { name: "upvoted submissions" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "favorite submissions" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("heading", { name: "Upvoted submissions" })).toBeInTheDocument();
    const item = screen.getByRole("listitem");
    expect(within(item).getByRole("link", { name: "Upvoted story" })).toHaveAttribute("href", "https://www.example.com/post");
    expect(item).toHaveTextContent("(example.com)");
    expect(item).toHaveTextContent(/42 points by alice \| .+ ago \| 3 comments$/);
    expect(within(item).getByRole("link", { name: "3 comments" })).toHaveAttribute("href", "/stories/11");
  });

  it("lists favorite submissions from bookmarks, falling back to HN links and zero counts", async () => {
    await renderServerPage(page("favorite-submissions"));
    expect(listBookmarks).toHaveBeenCalledWith(authUser.id);
    expect(screen.getByRole("heading", { name: "Favorite submissions" })).toBeInTheDocument();
    const item = screen.getByRole("listitem");
    expect(within(item).getByRole("link", { name: "Favorite story" })).toHaveAttribute("href", "https://news.ycombinator.com/item?id=12");
    expect(item).not.toHaveTextContent("(");
    expect(item).toHaveTextContent("0 points by alice");
    expect(within(item).getByRole("link", { name: "0 comments" })).toBeInTheDocument();
  });

  it("lists upvoted comments as plain text with a link to their discussion", async () => {
    await renderServerPage(page("upvoted-comments"));
    expect(listUpvotedComments).toHaveBeenCalledWith(authUser.id);
    expect(screen.getAllByRole("link", { name: "comments" })[0]).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { name: "Upvoted comments" })).toBeInTheDocument();
    const item = screen.getByRole("listitem");
    expect(within(item).getByText("<b>Great</b> post")).toBeInTheDocument();
    expect(item).toHaveTextContent(/^alice · .+ ago · on: discussion<b>Great<\/b> post$/);
    expect(within(item).getByRole("link", { name: "discussion" })).toHaveAttribute("href", "/stories/456");
  });

  it("lists favorite comments", async () => {
    await renderServerPage(page("favorite-comments"));
    expect(listFavoriteComments).toHaveBeenCalledWith(authUser.id);
    expect(screen.getByRole("heading", { name: "Favorite comments" })).toBeInTheDocument();
    expect(screen.getByText("Favorite comment")).toBeInTheDocument();
  });

  it("shows an empty message for an empty list and ignores unknown views", async () => {
    vi.mocked(listUpvotedComments).mockResolvedValue([]);
    vi.mocked(listBookmarks).mockResolvedValue([]);
    for (const view of ["upvoted-comments", "favorite-submissions"]) {
      cleanup();
      await renderServerPage(page(view));
      expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
    }
    vi.mocked(listUpvotedComments).mockClear();
    for (const view of ["unknown", "toString", ["upvoted-comments", "favorite-comments"]]) {
      cleanup();
      await renderServerPage(page(view));
      expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
    }
    expect(listUpvotedComments).not.toHaveBeenCalled();
  });

  it("offers retry guidance when profile data fails to load", async () => {
    vi.mocked(listUpvotedStories).mockRejectedValue(new Error("offline"));
    await renderServerPage(page("upvoted-submissions"));
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load your profile. Please try again.");
    expect(screen.getByRole("link", { name: "Retry" })).toHaveAttribute("href", "/profile?view=upvoted-submissions");
    cleanup();
    vi.mocked(getAccountCreatedAt).mockRejectedValue(new Error("expired"));
    await renderServerPage(page());
    expect(screen.getByRole("link", { name: "Retry" })).toHaveAttribute("href", "/profile");
  });
});
