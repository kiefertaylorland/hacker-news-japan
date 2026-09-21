import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { StoryCardSkeleton } from "@/components/stories/StoryCardSkeleton";
import { StoryGrid } from "@/components/stories/StoryGrid";
import { HITS_PER_PAGE } from "@/lib/constants";
import * as url from "@/lib/url";
import { makeStory, sampleStory } from "../../fixtures/stories";

describe("StoryGrid", () => {
  it.each([
    ["no", null],
    ["empty", []],
  ])("renders a full page of skeleton cards while loading with %s previous stories", (_label, stories) => {
    const { container } = render(createElement(StoryGrid, { stories, isLoading: true }));
    expect(container.querySelectorAll(".rounded-xl")).toHaveLength(HITS_PER_PAGE);
  });

  it("keeps previous stories visible and marks the grid busy while loading", () => {
    render(createElement(StoryGrid, { stories: [sampleStory], isLoading: true }));
    const grid = screen.getByText("Building in Japan").closest("[aria-busy]");
    expect(grid).toHaveAttribute("aria-busy", "true");
    expect(grid).toHaveClass(
      "grid",
      "animate-fade-in",
      "grid-cols-1",
      "gap-4",
      "transition-opacity",
      "md:grid-cols-2",
      "lg:grid-cols-3",
      "opacity-60"
    );
  });

  it("treats an unsaved story as unsaved when no savedIds are provided", () => {
    render(createElement(StoryGrid, { stories: [sampleStory], isLoading: false, onToggleSave: vi.fn() }));
    expect(screen.getByRole("button", { name: "Save story" })).toHaveAttribute("aria-pressed", "false");
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
    const getDomain = vi.spyOn(url, "getDomain");
    const stories = [sampleStory];
    const { rerender } = render(createElement(StoryGrid, { stories, isLoading: false }));
    getDomain.mockClear();

    rerender(createElement(StoryGrid, { stories, isLoading: false }));
    expect(getDomain).not.toHaveBeenCalled();

    // A loading flip rerenders the grid but memoized cards stay put.
    rerender(createElement(StoryGrid, { stories, isLoading: true }));
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
