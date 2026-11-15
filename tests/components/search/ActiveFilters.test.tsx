import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ActiveFilters } from "@/components/search/ActiveFilters";
import { mockSearchState } from "../../helpers/mockSearchState";

describe("ActiveFilters", () => {
  it("has no removable chips for default parameters", () => {
    render(<ActiveFilters {...mockSearchState()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("removes each active constraint and resets all while preserving a focus destination", async () => {
    const state = mockSearchState({ query: "tokyo", storyType: "job", dateRange: "week", sortBy: "points" });
    render(<ActiveFilters {...state} />);
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("button", { name: "Remove Search: tokyo" })).toHaveFocus();
    for (const name of ["Search: tokyo", "Type: Jobs", "When: Past Week", "Sort: Points"]) {
      await user.click(screen.getByRole("button", { name: `Remove ${name}` }));
      expect(document.getElementById("search-filters")).toHaveFocus();
    }
    expect(state.setQuery).toHaveBeenCalledWith("");
    expect(state.setStoryType).toHaveBeenCalledWith("all");
    expect(state.setDateRange).toHaveBeenCalledWith("all");
    expect(state.setSortBy).toHaveBeenCalledWith("date_desc");
    await user.click(screen.getByRole("button", { name: "Reset all" }));
    expect(state.reset).toHaveBeenCalledOnce();
    expect(document.getElementById("search-filters")).toHaveFocus();
  });
  it("tolerates unsupported URL values without inventing a selected option", () => {
    render(<ActiveFilters {...mockSearchState({ storyType: "invalid", dateRange: "invalid", sortBy: "invalid" } as never)} />);
    expect(screen.getAllByRole("button", { name: /Remove/ })).toHaveLength(3);
  });
});
