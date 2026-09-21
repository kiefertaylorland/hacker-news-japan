import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { StoryCardSkeleton } from "@/components/stories/StoryCardSkeleton";
import { StoryGrid } from "@/components/stories/StoryGrid";
import * as utils from "@/lib/utils";
import { makeStory, sampleStory } from "../../fixtures/stories";

describe("StoryGrid", () => {
  it("renders nine skeleton cards while loading", () => {
    const { container } = render(createElement(StoryGrid, { stories: null, isLoading: true }));
    expect(container.querySelectorAll(".rounded-xl")).toHaveLength(9);
  });

  it.each([
    ["null", null, "No stories found"],
    ["empty", [], "Try adjusting your filters or search."],
  ])("renders the empty state for %s stories", (_label, stories, text) => {
    render(createElement(StoryGrid, { stories, isLoading: false }));
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("renders a card per story", () => {
    render(createElement(StoryGrid, { stories: [sampleStory], isLoading: false }));
    expect(screen.getByText("Building in Japan")).toBeInTheDocument();
  });

  it("does not rerender unchanged stories while typing, but renders new results", () => {
    const getDomain = vi.spyOn(utils, "getDomain");
    const stories = [sampleStory];
    const { rerender } = render(createElement(StoryGrid, { stories, isLoading: false }));
    getDomain.mockClear();

    rerender(createElement(StoryGrid, { stories, isLoading: false }));
    expect(getDomain).not.toHaveBeenCalled();

    rerender(createElement(StoryGrid, { stories: [makeStory({ title: "Updated story" })], isLoading: false }));
    expect(getDomain).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Updated story")).toBeInTheDocument();
    getDomain.mockRestore();
  });

  it("marks saved stories in the grid", () => {
    render(
      createElement(StoryGrid, {
        stories: [sampleStory, makeStory({ objectID: "999", title: "Other" })],
        isLoading: false,
        savedIds: ["123"],
        onToggleSave: vi.fn(),
      })
    );
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save story" })).toBeInTheDocument();
  });
});

describe("StoryCardSkeleton", () => {
  it("renders a single card shell", () => {
    const { container } = render(createElement(StoryCardSkeleton));
    expect(container.querySelectorAll(".rounded-xl")).toHaveLength(1);
  });
});
