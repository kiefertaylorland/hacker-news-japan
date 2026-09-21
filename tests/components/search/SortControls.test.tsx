import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { SortControls } from "@/components/search/SortControls";
import { SORT_BY_OPTIONS } from "@/lib/constants";

describe("SortControls", () => {
  it("renders every sort option as a toggle", () => {
    render(createElement(SortControls, { sortBy: "relevance", onChange: vi.fn() }));

    for (const option of SORT_BY_OPTIONS) {
      expect(screen.getByRole("radio", { name: option.label })).toBeInTheDocument();
    }
    expect(screen.getByRole("radiogroup", { name: "Sort stories" })).toBeInTheDocument();
  });

  it("marks only the active sort as selected", () => {
    render(createElement(SortControls, { sortBy: "comments", onChange: vi.fn() }));

    expect(screen.getByRole("radio", { name: "Comments" })).toHaveAttribute("data-state", "on");
    expect(screen.getByRole("radio", { name: "Relevance" })).toHaveAttribute("data-state", "off");
  });

  it.each([
    ["Oldest", "date_asc"],
    ["Points", "points"],
  ])("calls onChange with the clicked sort value (%s)", async (label, value) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(createElement(SortControls, { sortBy: "relevance", onChange }));

    await user.click(screen.getByRole("radio", { name: label }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(value);
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
