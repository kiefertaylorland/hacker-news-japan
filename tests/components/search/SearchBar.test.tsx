import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "@/components/search/SearchBar";

describe("SearchBar", () => {
  it("renders the search bar and clears the query", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(createElement(SearchBar, { value: "", onChange }));

    fireEvent.change(screen.getByPlaceholderText("Search Japan stories..."), {
      target: { value: "kyoto" },
    });
    expect(onChange).toHaveBeenCalledWith("kyoto");

    rerender(createElement(SearchBar, { value: "kyoto", onChange, placeholder: "Search here" }));
    expect(screen.getByPlaceholderText("Search here")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenLastCalledWith("");
    expect(screen.getByRole("textbox", { name: "Search Japan stories" })).toHaveFocus();
    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "search");
  });
});
