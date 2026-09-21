import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "@/components/search/FilterBar";
import { STORY_TYPE_OPTIONS } from "@/lib/constants";

const baseProps = {
  storyType: "all" as const,
  dateRange: "week" as const,
  onStoryTypeChange: vi.fn(),
  onDateRangeChange: vi.fn(),
};

describe("FilterBar", () => {
  it("renders every story type option and the current date range label", () => {
    render(createElement(FilterBar, baseProps));

    for (const option of STORY_TYPE_OPTIONS) {
      expect(screen.getByRole("radio", { name: option.label })).toBeInTheDocument();
    }
    expect(screen.getByRole("combobox")).toHaveTextContent("Past Week");
    expect(screen.getByRole("combobox", { name: "Date range" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Story type" })).toBeInTheDocument();
  });

  it.each([
    ["Ask HN", "ask_hn"],
    ["Jobs", "job"],
  ])("calls onStoryTypeChange with the clicked story type (%s)", async (label, value) => {
    const user = userEvent.setup();
    const onStoryTypeChange = vi.fn();
    render(createElement(FilterBar, { ...baseProps, onStoryTypeChange }));

    await user.click(screen.getByRole("radio", { name: label }));

    expect(onStoryTypeChange).toHaveBeenCalledWith(value);
  });

  it("does not call onStoryTypeChange when deselecting the active type", async () => {
    const user = userEvent.setup();
    const onStoryTypeChange = vi.fn();
    render(createElement(FilterBar, { ...baseProps, storyType: "job", onStoryTypeChange }));

    await user.click(screen.getByRole("radio", { name: "Jobs" }));

    expect(onStoryTypeChange).not.toHaveBeenCalled();
  });

  it.each([
    ["Past Year", "year"],
    ["Past Month", "month"],
  ])("calls onDateRangeChange when %s is picked from the select", async (label, value) => {
    const user = userEvent.setup();
    const onDateRangeChange = vi.fn();
    render(createElement(FilterBar, { ...baseProps, onDateRangeChange }));

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText(label));

    expect(onDateRangeChange).toHaveBeenCalledWith(value);
  });
});
