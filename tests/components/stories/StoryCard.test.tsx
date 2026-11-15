import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { StoryCard } from "@/components/stories/StoryCard";
import { makeStory, sampleStory } from "../../fixtures/stories";

describe("StoryCard", () => {
  it("renders story cards for each badge and URL branch", () => {
    const askStory = makeStory({ _tags: ["ask_hn"], title: "Ask HN story", url: "https://example.com/ask" });
    const showStory = makeStory({ objectID: "234", _tags: ["show_hn"], title: "Show HN story", url: "javascript:alert(1)" });
    const jobStory = makeStory({ objectID: "345", _tags: ["job"], title: "Job story", url: "not-a-url" });
    const defaultStory = makeStory({ objectID: "456", title: "Default story", url: null, points: null, num_comments: null });

    const { rerender } = render(createElement(StoryCard, { story: askStory }));
    expect(screen.getByText("Ask HN")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /story/i })).toHaveAttribute("href", "https://example.com/ask");

    rerender(createElement(StoryCard, { story: showStory }));
    expect(screen.getByText("Show HN")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /story/i })).toHaveAttribute("href", "https://news.ycombinator.com/item?id=234");

    rerender(createElement(StoryCard, { story: jobStory }));
    expect(screen.getByText("Job")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /story/i })).toHaveAttribute("href", "https://news.ycombinator.com/item?id=345");

    rerender(createElement(StoryCard, { story: defaultStory }));
    expect(screen.getByText("Story")).toBeInTheDocument();
    expect(screen.queryByText("example.com")).not.toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it.each([12, 0, null])("labels the discussion link with %s comments", (count) => {
    render(createElement(StoryCard, { story: makeStory({ objectID: "123", num_comments: count }) }));
    const link = screen.getByRole("link", { name: `${count ?? 0} comments` });
    expect(link).toHaveAttribute("href", "/stories/123");
    expect(link).toHaveTextContent(String(count ?? 0));
  });

  it("keeps badge and accent precedence consistent for overlapping tags", () => {
    render(createElement(StoryCard, { story: makeStory({ _tags: ["job", "show_hn", "ask_hn"] }) }));
    expect(screen.getByText("Ask HN")).toHaveClass("border-blue-500/30");
    expect(screen.queryByText("Show HN")).not.toBeInTheDocument();
    expect(screen.queryByText("Job")).not.toBeInTheDocument();
  });

  it.each([
    ["ask_hn", "Ask HN", "border-blue-500/30"],
    ["show_hn", "Show HN", "border-emerald-500/30"],
    ["job", "Job", "border-slate-500/30"],
    ["story", "Story", "border-amber-500/30"],
  ] as const)("labels the %s category consistently", (tag, label, badgeClass) => {
    render(createElement(StoryCard, { story: makeStory({ _tags: tag === "story" ? [] : [tag] }) }));
    const badge = screen.getByText(label);
    expect(badge).toHaveClass("shrink-0", "rounded-full", "px-2", "py-0.5", badgeClass);

  });

  it("renders story timestamps as relative text", async () => {
    render(createElement(StoryCard, { story: sampleStory }));
    await waitFor(() =>
      expect(screen.getByText((content) => content.includes("ago"))).toBeInTheDocument()
    );
  });

  it("only renders a bookmark button when a save handler is provided", async () => {
    const onToggleSave = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(createElement(StoryCard, { story: sampleStory }));
    expect(screen.queryByRole("button", { name: "Save story" })).not.toBeInTheDocument();

    rerender(createElement(StoryCard, { story: sampleStory, onToggleSave }));
    const saveButton = screen.getByRole("button", { name: "Save story" });
    expect(saveButton).toHaveAttribute("aria-pressed", "false");
    await user.click(saveButton);
    expect(onToggleSave).toHaveBeenCalledWith(sampleStory);

    rerender(createElement(StoryCard, { story: sampleStory, onToggleSave, isSaved: true }));
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
  });


  it("exposes an accessible pending bookmark control and blocks duplicate clicks", async () => {
    const onToggleSave = vi.fn();
    render(createElement(StoryCard, { story: sampleStory, onToggleSave, isPending: true, isSaved: true }));
    const button = screen.getByRole("button", { name: "Remove bookmark" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveAttribute("aria-pressed", "true");
    await userEvent.setup().click(button);
    expect(onToggleSave).not.toHaveBeenCalled();
  });

  it("associates a bookmark error with its control and retries the affected story", async () => {
    const onToggleSave = vi.fn();
    const onRetrySave = vi.fn();
    render(createElement(StoryCard, { story: sampleStory, onToggleSave, onRetrySave, saveError: "Could not save this story." }));
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("Could not save this story.");
    expect(screen.getByRole("button", { name: "Save story" })).toHaveAttribute("aria-describedby", error.id);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry bookmark" }));
    expect(onRetrySave).toHaveBeenCalledWith(sampleStory.objectID);
    expect(onToggleSave).not.toHaveBeenCalled();
  });

  it("keeps the error readable without offering a retry when no retry handler is supplied", () => {
    render(createElement(StoryCard, { story: sampleStory, saveError: "No bookmark handler" }));
    expect(screen.queryByRole("button", { name: "Retry bookmark" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("No bookmark handler");
  });
});
