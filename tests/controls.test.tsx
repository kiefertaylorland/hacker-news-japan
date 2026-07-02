import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Pagination } from "@/components/dashboard/Pagination";
import { SortControls } from "@/components/dashboard/SortControls";
import { SORT_BY_OPTIONS, STORY_TYPE_OPTIONS } from "@/lib/constants";
import type { AlgoliaResponse } from "@/lib/types";

const sampleResults: AlgoliaResponse = {
  hits: [],
  nbHits: 90,
  nbPages: 3,
  page: 0,
  hitsPerPage: 30,
  query: "Japan",
};

describe("SortControls", () => {
  it("renders every sort option as a toggle", () => {
    render(createElement(SortControls, { sortBy: "relevance", onChange: vi.fn() }));

    for (const option of SORT_BY_OPTIONS) {
      expect(screen.getByRole("radio", { name: option.label })).toBeInTheDocument();
    }
  });

  it("marks only the active sort as selected", () => {
    render(createElement(SortControls, { sortBy: "comments", onChange: vi.fn() }));

    expect(screen.getByRole("radio", { name: "Comments" })).toHaveAttribute(
      "data-state",
      "on"
    );
    expect(screen.getByRole("radio", { name: "Relevance" })).toHaveAttribute(
      "data-state",
      "off"
    );
  });

  it("calls onChange with the clicked sort value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(createElement(SortControls, { sortBy: "relevance", onChange }));

    await user.click(screen.getByRole("radio", { name: "Oldest" }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("date_asc");
  });

  it("does not call onChange when the active option is clicked again", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(createElement(SortControls, { sortBy: "points", onChange }));

    // Toggling off yields an empty value, which the component guards against.
    await user.click(screen.getByRole("radio", { name: "Points" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("FilterBar", () => {
  const baseProps = {
    storyType: "all" as const,
    dateRange: "week" as const,
    onStoryTypeChange: vi.fn(),
    onDateRangeChange: vi.fn(),
  };

  it("renders every story type option and the current date range label", () => {
    render(createElement(FilterBar, baseProps));

    for (const option of STORY_TYPE_OPTIONS) {
      expect(screen.getByRole("radio", { name: option.label })).toBeInTheDocument();
    }
    expect(screen.getByRole("combobox")).toHaveTextContent("Past Week");
  });

  it("calls onStoryTypeChange with the clicked story type", async () => {
    const user = userEvent.setup();
    const onStoryTypeChange = vi.fn();
    render(createElement(FilterBar, { ...baseProps, onStoryTypeChange }));

    await user.click(screen.getByRole("radio", { name: "Ask HN" }));

    expect(onStoryTypeChange).toHaveBeenCalledWith("ask_hn");
  });

  it("does not call onStoryTypeChange when deselecting the active type", async () => {
    const user = userEvent.setup();
    const onStoryTypeChange = vi.fn();
    render(
      createElement(FilterBar, { ...baseProps, storyType: "job", onStoryTypeChange })
    );

    await user.click(screen.getByRole("radio", { name: "Jobs" }));

    expect(onStoryTypeChange).not.toHaveBeenCalled();
  });

  it("calls onDateRangeChange when a new range is picked from the select", async () => {
    const user = userEvent.setup();
    const onDateRangeChange = vi.fn();
    render(createElement(FilterBar, { ...baseProps, onDateRangeChange }));

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Past Year"));

    expect(onDateRangeChange).toHaveBeenCalledWith("year");
  });
});

describe("Pagination", () => {
  it("caps the number of page buttons at five", () => {
    render(
      createElement(Pagination, {
        results: { ...sampleResults, nbPages: 20 },
        currentPage: 0,
        onPageChange: vi.fn(),
        isLoading: false,
      })
    );

    expect(screen.getAllByRole("button", { name: /^\d+$/ })).toHaveLength(5);
  });

  it("shows fewer page buttons when there are fewer pages", () => {
    render(
      createElement(Pagination, {
        results: { ...sampleResults, nbPages: 2 },
        currentPage: 0,
        onPageChange: vi.fn(),
        isLoading: false,
      })
    );

    expect(screen.getAllByRole("button", { name: /^\d+$/ })).toHaveLength(2);
  });

  it("marks the current page with aria-current", () => {
    render(
      createElement(Pagination, {
        results: sampleResults,
        currentPage: 1,
        onPageChange: vi.fn(),
        isLoading: false,
      })
    );

    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("button", { name: "1" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("disables Next on the last page and reports the previous page on click", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      createElement(Pagination, {
        results: sampleResults,
        currentPage: 2,
        onPageChange,
        isLoading: false,
      })
    );

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("disables all buttons while loading", () => {
    render(
      createElement(Pagination, {
        results: sampleResults,
        currentPage: 1,
        onPageChange: vi.fn(),
        isLoading: true,
      })
    );

    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});
