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

    rerender(createElement(StoryCard, { story: showStory, index: 10 }));
    expect(screen.getByText("Show HN")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://news.ycombinator.com/item?id=234");
    expect(screen.getByRole("link").closest(".animate-slide-up")).toHaveStyle({ animationDelay: "320ms" });

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
});
