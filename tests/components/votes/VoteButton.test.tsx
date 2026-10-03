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
