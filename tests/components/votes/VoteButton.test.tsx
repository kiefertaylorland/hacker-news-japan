import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VoteButton } from "@/components/votes/VoteButton";
import { upvote } from "@/lib/votes/actions";
import { loadVote } from "@/lib/votes/client";
vi.mock("@/lib/votes/actions", () => ({ upvote: vi.fn() }));
vi.mock("@/lib/votes/client", () => ({ loadVote: vi.fn() }));

describe("vote button", () => {
  it("loads persisted votes and displays a selected icon after reload", async () => {
    vi.mocked(loadVote).mockResolvedValue({ count: 3, voted: true }); render(<VoteButton storyId="123" points={10} />);
    const button = await screen.findByRole("button", { name: "Upvoted" }); expect(button).toHaveAttribute("aria-pressed", "true"); expect(button).toHaveClass("text-hn"); expect(button).toHaveTextContent("13"); expect(button).toBeDisabled();
  });
  it("increments once after saving and prevents repeated voting", async () => {
    vi.mocked(loadVote).mockResolvedValue({ count: 2, voted: false }); vi.mocked(upvote).mockResolvedValue({}); const user = userEvent.setup(); render(<VoteButton storyId="123" points={10} />);
    const button = screen.getByRole("button", { name: "Upvote" }); await waitFor(() => expect(button).toBeEnabled()); expect(button).toHaveTextContent("12"); await user.click(button);
    await screen.findByRole("button", { name: "Upvoted" }); expect(button).toHaveTextContent("13"); await user.click(button); expect(upvote).toHaveBeenCalledTimes(1); expect(upvote).toHaveBeenCalledWith("123");
  });
  it("handles null points, authorization errors and retryable failures without incrementing", async () => {
    vi.mocked(loadVote).mockResolvedValue({ count: 0, voted: false }); vi.mocked(upvote).mockResolvedValueOnce({ error: "Sign in to upvote." }).mockRejectedValueOnce(new Error("offline"));
    const user = userEvent.setup(); render(<VoteButton storyId="123" points={null} />); const button = screen.getByRole("button", { name: "Upvote" }); await waitFor(() => expect(button).toBeEnabled());
    await user.click(button); expect(await screen.findByRole("alert")).toHaveTextContent("Sign in to upvote."); expect(button).toHaveTextContent("0"); expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button); await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Could not upvote. Please try again."));
  });
  it("keeps voting disabled if the persisted state fails to load", async () => {
    vi.mocked(loadVote).mockRejectedValue(new Error("offline")); render(<VoteButton storyId="123" points={1} />); expect(await screen.findByRole("alert")).toHaveTextContent("Could not load votes."); expect(screen.getByRole("button")).toBeDisabled();
  });
  it("ignores stale responses after unmount", async () => {
    let resolve!: (value: { count: number; voted: boolean }) => void; vi.mocked(loadVote).mockReturnValue(new Promise((r) => { resolve = r; })); const { unmount } = render(<VoteButton storyId="123" points={1} />); unmount(); await act(async () => { resolve({ count: 5, voted: true }); }); expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("ignores rejected responses after unmount", async () => {
    let reject!: (error: Error) => void; vi.mocked(loadVote).mockReturnValue(new Promise((_r, r) => { reject = r; })); const { unmount } = render(<VoteButton storyId="123" points={1} />); unmount(); await act(async () => { reject(new Error("offline")); }); expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it.each(["resolve", "reject"] as const)("ignores a stale %s after switching stories", async (outcome) => {
    let resolve!: (value: { count: number; voted: boolean }) => void;
    let reject!: (error: Error) => void;
    vi.mocked(loadVote)
      .mockReturnValueOnce(new Promise((res, rej) => { resolve = res; reject = rej; }))
      .mockResolvedValueOnce({ count: 2, voted: false });
    const { rerender } = render(<VoteButton storyId="123" points={10} />);
    expect(screen.getByRole("button")).toBeDisabled();

    rerender(<VoteButton storyId="456" points={20} />);
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
    expect(loadVote).toHaveBeenLastCalledWith("456");
    expect(screen.getByRole("button", { name: "Upvote" })).toHaveTextContent("22");

    await act(async () => {
      if (outcome === "resolve") resolve({ count: 99, voted: true });
      else reject(new Error("old request failed"));
    });
    const button = screen.getByRole("button", { name: "Upvote" });
    expect(button).toHaveTextContent("22");
    expect(button).toBeEnabled();
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
  it("preserves motion, keyboard focus and unselected vote styling", async () => {
    vi.mocked(loadVote).mockResolvedValue({ count: 0, voted: false });
    render(<VoteButton storyId="123" points={10} />);
    const button = screen.getByRole("button", { name: "Upvote" });
    await waitFor(() => expect(button).toBeEnabled());
    expect(button).toHaveClass("vote-motion", "focus-visible:ring-2", "focus-visible:ring-hn", "text-slate-400", "hover:text-hn");
    expect(button).not.toHaveClass("text-hn");
  });
  it("clears a previous error while a retry is pending", async () => {
    vi.mocked(loadVote).mockResolvedValue({ count: 0, voted: false });
    vi.mocked(upvote).mockResolvedValueOnce({ error: "Try again" });
    const user = userEvent.setup(); render(<VoteButton storyId="123" points={1} />);
    const button = screen.getByRole("button"); await waitFor(() => expect(button).toBeEnabled()); await user.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again");
    let resolve!: (value: { error?: string }) => void;
    vi.mocked(upvote).mockReturnValueOnce(new Promise((r) => { resolve = r; })); await user.click(button);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(async () => { resolve({}); }); expect(button).toHaveAttribute("aria-pressed", "true");
  });
  it("disables repeated submission while a vote is being persisted", async () => {
    vi.mocked(loadVote).mockResolvedValue({ count: 0, voted: false }); let resolve!: (value: { error?: string }) => void; vi.mocked(upvote).mockReturnValue(new Promise((r) => { resolve = r; })); const user = userEvent.setup(); render(<VoteButton storyId="123" points={1} />); const button = screen.getByRole("button"); await waitFor(() => expect(button).toBeEnabled()); await user.click(button); expect(button).toBeDisabled(); await act(async () => { resolve({}); }); expect(button).toHaveAttribute("aria-pressed", "true");
  });
});
