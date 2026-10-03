import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DiscussionPage from "@/app/stories/[id]/page";
import { getDiscussion } from "@/lib/comments/algolia";
import { listComments } from "@/lib/comments/queries";
import { getCurrentUser } from "@/lib/auth/user";
import { authUser, sampleStory } from "../fixtures/stories";
import { renderServerPage } from "../helpers/renderServerPage";
vi.mock("@/lib/comments/algolia", () => ({ getDiscussion: vi.fn() }));
vi.mock("@/lib/comments/queries", () => ({ listComments: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/app/auth/actions", () => import("../helpers/mockNext").then((m) => m.authActionsMock()));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
beforeEach(() => {
  vi.mocked(getDiscussion).mockResolvedValue({ id: 123, type: "story", title: "Japan discussion", children: [] });
  vi.mocked(listComments).mockResolvedValue([]); vi.mocked(getCurrentUser).mockResolvedValue(null);
});
const page = () => DiscussionPage({ params: Promise.resolve({ id: "123" }) });
describe("discussion page", () => {
  it("renders a loading shell and an anonymous discussion with sign-in", async () => {
    render(page().props.fallback); expect(screen.getByRole("status")).toHaveTextContent("Loading discussion");
    await renderServerPage(page()); expect(screen.getByRole("heading", { name: "Japan discussion" })).toBeInTheDocument();
    expect(screen.getByText("No comments yet.")).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument(); expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
  it("shows the form and local comments as escaped text", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(authUser);
    vi.mocked(listComments).mockResolvedValue([{ id: "local-1", author: "Local author", body: "<script>hello</script>", created_at: sampleStory.created_at }]);
    await renderServerPage(page()); expect(screen.getByRole("textbox", { name: "Comment" })).toBeInTheDocument(); expect(screen.getByText("<script>hello</script>")).toBeInTheDocument(); expect(screen.getByText("Local author")).toBeInTheDocument();
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
});
