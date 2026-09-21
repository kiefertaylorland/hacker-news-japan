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
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com/ask");

    rerender(createElement(StoryCard, { story: showStory }));
    expect(screen.getByText("Show HN")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://news.ycombinator.com/item?id=234");

    rerender(createElement(StoryCard, { story: jobStory }));
    expect(screen.getByText("Job")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://news.ycombinator.com/item?id=345");

    rerender(createElement(StoryCard, { story: defaultStory }));
    expect(screen.getByText("Story")).toBeInTheDocument();
    expect(screen.queryByText("example.com")).not.toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("keeps badge and accent precedence consistent for overlapping tags", () => {
    const { container } = render(
      createElement(StoryCard, { story: makeStory({ _tags: ["job", "show_hn", "ask_hn"] }) })
    );
    expect(screen.getByText("Ask HN")).toHaveClass("border-blue-500/30");
    expect(container.querySelector(".border-l-2")).toHaveClass("border-l-blue-500/60");
  });

  it.each([
    ["ask_hn", "Ask HN", "border-blue-500/30", "border-l-blue-500/60"],
    ["show_hn", "Show HN", "border-emerald-500/30", "border-l-emerald-500/60"],
    ["job", "Job", "border-slate-500/30", "border-l-slate-500/40"],
    ["story", "Story", "border-amber-500/30", "border-l-hn/50"],
  ] as const)("applies the %s badge and accent classes", (tag, label, badgeClass, accentClass) => {
    const { container } = render(
      createElement(StoryCard, { story: makeStory({ _tags: tag === "story" ? [] : [tag] }) })
    );
    const badge = screen.getByText(label);
    expect(badge).toHaveClass("shrink-0", "rounded-full", "px-2", "py-0.5", badgeClass);
    expect(container.querySelector(".border-l-2")).toHaveClass(accentClass);
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
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(createElement(StoryCard, { story: sampleStory, onToggleSave }));
    const saveButton = screen.getByRole("button", { name: "Save story" });
    expect(saveButton).toHaveAttribute("aria-pressed", "false");
    await user.click(saveButton);
    expect(onToggleSave).toHaveBeenCalledWith(sampleStory);

    rerender(createElement(StoryCard, { story: sampleStory, onToggleSave, isSaved: true }));
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("applies base and state-dependent classes to the bookmark button", () => {
    const { rerender } = render(createElement(StoryCard, { story: sampleStory, onToggleSave: vi.fn() }));
    const unsaved = screen.getByRole("button", { name: "Save story" });
    expect(unsaved).toHaveClass("-mr-2", "-mt-1.5", "h-7", "w-7", "shrink-0", "hover:bg-white/10", "text-slate-500", "hover:text-slate-200");
    expect(unsaved).not.toHaveClass("text-hn");

    rerender(createElement(StoryCard, { story: sampleStory, onToggleSave: vi.fn(), isSaved: true }));
    const saved = screen.getByRole("button", { name: "Remove bookmark" });
    expect(saved).toHaveClass("-mr-2", "-mt-1.5", "h-7", "w-7", "shrink-0", "hover:bg-white/10", "text-hn");
    expect(saved).not.toHaveClass("text-slate-500");
  });
});
