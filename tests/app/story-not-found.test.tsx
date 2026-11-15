import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import StoryNotFound from "@/app/stories/[id]/not-found";

describe("missing story", () => {
  it("explains the missing story and offers a route back to browsing", () => {
    render(<StoryNotFound />);
    expect(screen.getByRole("heading", { name: "Story not found" })).toBeInTheDocument();
    expect(screen.getByText("This story is unavailable or the link is no longer valid.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse stories" })).toHaveAttribute("href", "/");
  });
});
