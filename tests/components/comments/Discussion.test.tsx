import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommentForm } from "@/components/comments/CommentForm";
import { CommentThread } from "@/components/comments/CommentThread";
import { postComment } from "@/lib/comments/actions";
import { StoryCard } from "@/components/stories/StoryCard";
import { sampleStory } from "../../fixtures/stories";
vi.mock("@/lib/comments/actions", () => ({ postComment: vi.fn() }));

describe("discussion UI", () => {
  it("links comment icons to the same-site discussion", () => {
    render(<StoryCard story={sampleStory} />);
    expect(screen.getByRole("link", { name: /comments/ })).toHaveAttribute("href", `/stories/${sampleStory.objectID}`);
    expect(screen.getByRole("link", { name: /comments/ })).not.toHaveAttribute("target");
  });
  it("renders HN-style nested comments and safely preserves paragraphs and links", () => {
    const { container } = render(<CommentThread comments={[
      { id: 1, author: "alice", created_at: sampleStory.created_at, text: '<p>Hello <i>Japan</i> <a href="https://example.com">link</a><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a></p>', children: [{ id: 2, author: "bob", created_at: sampleStory.created_at, text: "Reply", children: [] }] },
      { id: 3, author: null, created_at: sampleStory.created_at, text: null, children: [{ id: 4, author: "child", created_at: sampleStory.created_at, text: "Still visible", children: [] }] },
    ]} />);
    expect(screen.getByText("alice")).toBeInTheDocument(); expect(screen.getByText("Reply")).toBeInTheDocument(); expect(screen.getByText("Still visible")).toBeInTheDocument(); expect(screen.getAllByText("[deleted]")).toHaveLength(2);
    expect(container.querySelector("script, img")).toBeNull(); expect(screen.getByText("bad")).not.toHaveAttribute("href"); expect(screen.getByText("Japan").tagName).toBe("I");
    expect(screen.getByText("Reply").closest("ul")?.parentElement?.closest("li")).toHaveAttribute("id", "comment-1");
  });
  it("posts comments, clears only successful submissions and displays failures", async () => {
    const user = userEvent.setup(); vi.mocked(postComment).mockResolvedValueOnce({}).mockResolvedValueOnce({ error: "Try again" }).mockRejectedValueOnce(new Error("offline"));
    render(<CommentForm storyId="123" />);
    const input = screen.getByRole("textbox", { name: "Comment" });
    const submit = screen.getByRole("button", { name: "Add comment" });
    expect(submit).toBeDisabled(); await user.type(input, "Hello"); await user.click(submit);
    await waitFor(() => expect(input).toHaveValue("")); expect(postComment).toHaveBeenCalledWith("123", "Hello"); expect(screen.getByRole("status")).toHaveTextContent("Comment posted.");
    await user.type(input, "Keep draft"); await user.click(submit); expect(await screen.findByRole("alert")).toHaveTextContent("Try again"); expect(input).toHaveValue("Keep draft");
    await user.click(submit); await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not post comment. Please try again."));
  });
  it("disables editing and repeated submission while saving", async () => {
    let resolve!: (value: { error?: string }) => void; vi.mocked(postComment).mockReturnValue(new Promise((r) => { resolve = r; }));
    const user = userEvent.setup(); render(<CommentForm storyId="123" />); await user.type(screen.getByRole("textbox"), "Hi"); await user.click(screen.getByRole("button"));
    expect(screen.getByRole("textbox")).toBeDisabled(); expect(screen.getByRole("button", { name: "Posting…" })).toBeDisabled(); resolve({}); await screen.findByText("Comment posted.");
  });
});
