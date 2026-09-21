import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "@/components/search/Pagination";
import { makeResults } from "../../fixtures/stories";

const sampleResults = makeResults({ hits: [], nbHits: 90, nbPages: 3 });

function renderPagination(props: Partial<Parameters<typeof Pagination>[0]> = {}) {
  return render(
    createElement(Pagination, {
      results: sampleResults,
      currentPage: 0,
      onPageChange: vi.fn(),
      isLoading: false,
      ...props,
    })
  );
}

describe("Pagination", () => {
  it.each([
    ["no results", null],
    ["a single page", makeResults({ nbPages: 1 })],
  ])("renders nothing with %s", (_label, results) => {
    const { container } = renderPagination({ results });
    expect(container.firstChild).toBeNull();
  });

  it("renders pagination controls and handles enabled and disabled states", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const { rerender } = renderPagination({ results: makeResults({ nbPages: 7 }), onPageChange });

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: /^[1-5]$/ })).toHaveLength(5);

    await user.click(screen.getByRole("button", { name: "2" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    rerender(
      createElement(Pagination, {
        results: makeResults({ nbPages: 7 }),
        currentPage: 1,
        onPageChange,
        isLoading: false,
      })
    );
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it.each([6, 19])("keeps the current page visible beyond the first five pages (%s)", async (page) => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderPagination({ results: makeResults({ nbPages: 20 }), currentPage: page, onPageChange });

    expect(screen.getByRole("button", { name: String(page + 1) })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText(`Page ${page + 1} of 20`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: String(page) }));
    expect(onPageChange).toHaveBeenCalledWith(page - 1);
    expect(screen.getAllByRole("button", { name: /^\d+$/ })).toHaveLength(5);
  });

  it.each([
    [20, 5],
    [2, 2],
  ])("shows at most five page buttons (%s pages -> %s buttons)", (nbPages, buttons) => {
    renderPagination({ results: makeResults({ nbPages }) });
    expect(screen.getAllByRole("button", { name: /^\d+$/ })).toHaveLength(buttons);
  });

  it("marks the current page with aria-current", () => {
    renderPagination({ currentPage: 1 });
    expect(screen.getByRole("button", { name: "2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "1" })).not.toHaveAttribute("aria-current");
  });

  it("disables Next on the last page and reports the previous page on click", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    renderPagination({ currentPage: 2, onPageChange });

    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("disables all buttons while loading", () => {
    renderPagination({ currentPage: 1, isLoading: true });
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
    }
  });
});
