import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ResultsHeader } from "@/components/search/ResultsHeader";
import { makeResults } from "../../fixtures/stories";

describe("ResultsHeader", () => {
  it("renders a skeleton while loading", () => {
    const { container } = render(createElement(ResultsHeader, { query: "", results: null, isLoading: true }));
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders nothing without results", () => {
    const { container } = render(createElement(ResultsHeader, { query: "", results: null, isLoading: false }));
    expect(container.firstChild).toBeNull();
  });

  it("renders the plural count with the matched query", () => {
    render(createElement(ResultsHeader, { query: "tokyo", results: makeResults({ nbHits: 2 }), isLoading: false }));
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("stories")).toBeInTheDocument();
    expect(screen.getByText("tokyo")).toBeInTheDocument();
  });

  it("renders the singular count without a query", () => {
    render(createElement(ResultsHeader, { query: "", results: makeResults({ nbHits: 1 }), isLoading: false }));
    expect(screen.getByText("story")).toBeInTheDocument();
    expect(screen.getByText("about Japan")).toBeInTheDocument();
  });

  it("labels client-sorted results as a top window", () => {
    render(createElement(ResultsHeader, { query: "", results: makeResults({ nbHits: 300 }), isLoading: false, sortBy: "points" }));
    expect(screen.getByText("Top")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
  });

  it("does not label server-sorted results", () => {
    render(createElement(ResultsHeader, { query: "", results: makeResults({ nbHits: 300 }), isLoading: false, sortBy: "date_desc" }));
    expect(screen.queryByText("Top")).not.toBeInTheDocument();
  });
});
