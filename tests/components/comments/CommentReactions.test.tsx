import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CommentReactions } from "@/components/comments/CommentReactions";
import { setCommentFavorite, upvoteComment } from "@/lib/comments/reaction-actions";
vi.mock("@/lib/comments/reaction-actions", () => ({ upvoteComment: vi.fn(), setCommentFavorite: vi.fn() }));

describe("comment reactions", () => {
  it("shows persisted upvote and favorite state", () => {
    render(<CommentReactions commentId="c1" upvoted favorited />);
    const upvote = screen.getByRole("button", { name: "Upvoted comment" });
    expect(upvote).toHaveAttribute("aria-pressed", "true"); expect(upvote).toHaveClass("text-hn"); expect(upvote).toBeDisabled();
    expect(screen.getByRole("button", { name: "un-favorite" })).toHaveAttribute("aria-pressed", "true");
  });
  it("upvotes once and prevents repeated voting", async () => {
    vi.mocked(upvoteComment).mockResolvedValue({}); const user = userEvent.setup();
    render(<CommentReactions commentId="c1" upvoted={false} favorited={false} />);
    const upvote = screen.getByRole("button", { name: "Upvote comment" });
    expect(upvote).toHaveAttribute("aria-pressed", "false"); expect(upvote).not.toHaveClass("text-hn"); expect(upvote).toHaveClass("text-slate-400", "focus-visible:ring-hn");
    await user.click(upvote);
    await waitFor(() => expect(upvote).toHaveAccessibleName("Upvoted comment"));
    expect(upvote).toBeDisabled(); expect(upvoteComment).toHaveBeenCalledTimes(1); expect(upvoteComment).toHaveBeenCalledWith("c1");
  });
  it("toggles favorites in both directions", async () => {
    vi.mocked(setCommentFavorite).mockResolvedValue({}); const user = userEvent.setup();
    render(<CommentReactions commentId="c1" upvoted={false} favorited={false} />);
    const favorite = screen.getByRole("button", { name: "favorite" });
    expect(favorite).toHaveAttribute("aria-pressed", "false");
    await user.click(favorite);
    await waitFor(() => expect(favorite).toHaveAccessibleName("un-favorite"));
    expect(setCommentFavorite).toHaveBeenLastCalledWith("c1", true);
    await user.click(favorite);
    await waitFor(() => expect(favorite).toHaveAccessibleName("favorite"));
    expect(setCommentFavorite).toHaveBeenLastCalledWith("c1", false);
  });
  it("keeps state on returned and thrown errors", async () => {
    vi.mocked(upvoteComment).mockResolvedValueOnce({ error: "Sign in to upvote." });
    vi.mocked(setCommentFavorite).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup();
    render(<CommentReactions commentId="c1" upvoted={false} favorited={false} />);
    await user.click(screen.getByRole("button", { name: "Upvote comment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to upvote.");
    await user.click(screen.getByRole("button", { name: "favorite" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not update. Please try again."));
    expect(screen.getByRole("button", { name: "Upvote comment" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "favorite" })).toHaveAttribute("aria-pressed", "false");
  });
  it("disables both controls and clears errors while a change is saving", async () => {
    vi.mocked(upvoteComment).mockResolvedValueOnce({ error: "Try again" });
    const user = userEvent.setup();
    render(<CommentReactions commentId="c1" upvoted={false} favorited={false} />);
    await user.click(screen.getByRole("button", { name: "Upvote comment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again");
    let resolve!: (value: { error?: string }) => void;
    vi.mocked(setCommentFavorite).mockReturnValueOnce(new Promise((r) => { resolve = r; }));
    await user.click(screen.getByRole("button", { name: "favorite" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upvote comment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "favorite" })).toBeDisabled();
    await act(async () => { resolve({}); });
    expect(screen.getByRole("button", { name: "un-favorite" })).toBeEnabled();
  });
});
