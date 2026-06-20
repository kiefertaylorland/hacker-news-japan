import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { Pagination } from "@/components/dashboard/Pagination";
import { ResultsHeader } from "@/components/dashboard/ResultsHeader";
import { SearchBar } from "@/components/dashboard/SearchBar";
import { SortControls } from "@/components/dashboard/SortControls";
import { StoryCard } from "@/components/dashboard/StoryCard";
import { StoryCardSkeleton } from "@/components/dashboard/StoryCardSkeleton";
import { StoryGrid } from "@/components/dashboard/StoryGrid";
import type { AlgoliaResponse, HNStory } from "@/lib/types";

const useSearchMock = vi.fn();

vi.mock("@/hooks/useSearch", () => ({
  useSearch: () => useSearchMock(),
}));

const sampleStory: HNStory = {
  objectID: "123",
  title: "Building in Japan",
  url: "https://www.example.com/post",
  author: "alice",
  points: 42,
  num_comments: 7,
  created_at: "2024-01-01T00:00:00.000Z",
  created_at_i: 10,
  _tags: ["story"],
  story_id: 123,
};

const sampleResults: AlgoliaResponse = {
  hits: [sampleStory],
  nbHits: 1,
  nbPages: 3,
  page: 0,
  hitsPerPage: 30,
  query: "Japan",
};

describe("dashboard components", () => {
  beforeEach(() => {
    useSearchMock.mockReset();
  });

  it("renders the dashboard with results and an error", () => {
    useSearchMock.mockReturnValue({
      query: "tokyo",
      storyType: "story",
      dateRange: "week",
      sortBy: "points",
      page: 1,
      results: sampleResults,
      isLoading: false,
      error: "Request failed",
      setQuery: vi.fn(),
      setStoryType: vi.fn(),
      setDateRange: vi.fn(),
      setSortBy: vi.fn(),
      setPage: vi.fn(),
    });

    render(createElement(Dashboard));

    expect(screen.getByText("日本")).toBeInTheDocument();
    expect(screen.getByText("Request failed")).toBeInTheDocument();
    expect(screen.getByDisplayValue("tokyo")).toBeInTheDocument();
    expect(screen.getByText("Building in Japan")).toBeInTheDocument();
  });

  it("renders the dashboard without errors or results", () => {
    useSearchMock.mockReturnValue({
      query: "",
      storyType: "all",
      dateRange: "all",
      sortBy: "date_desc",
      page: 0,
      results: null,
      isLoading: false,
      error: null,
      setQuery: vi.fn(),
      setStoryType: vi.fn(),
      setDateRange: vi.fn(),
      setSortBy: vi.fn(),
      setPage: vi.fn(),
    });

    render(createElement(Dashboard));

    expect(screen.queryByText("Request failed")).not.toBeInTheDocument();
    expect(screen.getByText("No stories found")).toBeInTheDocument();
  });

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
  });

  it("renders filter controls and fires callbacks", async () => {
    const user = userEvent.setup();
    const onStoryTypeChange = vi.fn();
    const onDateRangeChange = vi.fn();

    render(
      createElement(FilterBar, {
        storyType: "story",
        dateRange: "all",
        onStoryTypeChange,
        onDateRangeChange,
      })
    );

    await user.click(screen.getByRole("radio", { name: "Jobs" }));
    expect(onStoryTypeChange).toHaveBeenCalledWith("job");

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByText("Past Month"));
    expect(onDateRangeChange).toHaveBeenCalledWith("month");
  });

  it("renders sort controls and updates the selected sort", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(createElement(SortControls, { sortBy: "relevance", onChange }));
    await user.click(screen.getByRole("radio", { name: "Points" }));

    expect(onChange).toHaveBeenCalledWith("points");
  });

  it("renders all results header states", () => {
    const loadingView = render(createElement(ResultsHeader, { query: "", results: null, isLoading: true }));
    expect(loadingView.container.querySelector(".animate-pulse")).toBeInTheDocument();
    loadingView.unmount();

    const emptyView = render(createElement(ResultsHeader, { query: "", results: null, isLoading: false }));
    expect(emptyView.container.firstChild).toBeNull();
    emptyView.unmount();

    render(
      createElement(ResultsHeader, {
        query: "tokyo",
        results: { ...sampleResults, nbHits: 2 },
        isLoading: false,
      })
    );
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("stories")).toBeInTheDocument();
    expect(screen.getByText("tokyo")).toBeInTheDocument();

    const singleView = render(
      createElement(ResultsHeader, {
        query: "",
        results: { ...sampleResults, nbHits: 1 },
        isLoading: false,
      })
    );
    expect(singleView.getByText("story")).toBeInTheDocument();
    expect(singleView.getByText("about Japan")).toBeInTheDocument();
  });

  it("renders pagination null states", () => {
    const noResults = render(
      createElement(Pagination, {
        results: null,
        currentPage: 0,
        onPageChange: vi.fn(),
        isLoading: false,
      })
    );
    expect(noResults.container.firstChild).toBeNull();
    noResults.unmount();

    const singlePage = render(
      createElement(Pagination, {
        results: { ...sampleResults, nbPages: 1 },
        currentPage: 0,
        onPageChange: vi.fn(),
        isLoading: false,
      })
    );
    expect(singlePage.container.firstChild).toBeNull();
  });

  it("renders pagination controls and handles enabled and disabled states", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    const { rerender } = render(
      createElement(Pagination, {
        results: { ...sampleResults, nbPages: 7 },
        currentPage: 0,
        onPageChange,
        isLoading: false,
      })
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
    expect(screen.getAllByRole("button", { name: /^[1-5]$/ })).toHaveLength(5);

    await user.click(screen.getByRole("button", { name: "2" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(1);

    rerender(
      createElement(Pagination, {
        results: { ...sampleResults, nbPages: 7 },
        currentPage: 1,
        onPageChange,
        isLoading: false,
      })
    );
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(0);

    rerender(
      createElement(Pagination, {
        results: { ...sampleResults, nbPages: 3 },
        currentPage: 2,
        onPageChange,
        isLoading: true,
      })
    );

    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("renders story cards for each badge and URL branch", () => {
    const askStory = {
      ...sampleStory,
      _tags: ["ask_hn"],
      title: "Ask HN story",
      url: "https://example.com/ask",
    };
    const showStory = {
      ...sampleStory,
      objectID: "234",
      _tags: ["show_hn"],
      title: "Show HN story",
      url: "javascript:alert(1)",
    };
    const jobStory = {
      ...sampleStory,
      objectID: "345",
      _tags: ["job"],
      title: "Job story",
      url: "not-a-url",
    };
    const defaultStory = {
      ...sampleStory,
      objectID: "456",
      title: "Default story",
      url: null,
      points: null,
      num_comments: null,
    };

    const { rerender } = render(createElement(StoryCard, { story: askStory }));
    expect(screen.getByText("Ask HN")).toBeInTheDocument();
    expect(screen.getByText("example.com")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://example.com/ask");

    rerender(createElement(StoryCard, { story: showStory, index: 10 }));
    expect(screen.getByText("Show HN")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://news.ycombinator.com/item?id=234"
    );
    expect(screen.getByRole("link")).toHaveStyle({ animationDelay: "320ms" });

    rerender(createElement(StoryCard, { story: jobStory }));
    expect(screen.getByText("Job")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "https://news.ycombinator.com/item?id=345"
    );

    rerender(createElement(StoryCard, { story: defaultStory }));
    expect(screen.getByText("Story")).toBeInTheDocument();
    expect(screen.queryByText("example.com")).not.toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(2);
  });

  it("renders story grid loading, null, empty, and populated states", () => {
    const loadingView = render(createElement(StoryGrid, { stories: null, isLoading: true }));
    expect(loadingView.container.querySelectorAll(".rounded-xl")).toHaveLength(9);
    loadingView.unmount();

    const nullView = render(createElement(StoryGrid, { stories: null, isLoading: false }));
    expect(nullView.getByText("No stories found")).toBeInTheDocument();
    nullView.unmount();

    const emptyView = render(createElement(StoryGrid, { stories: [], isLoading: false }));
    expect(emptyView.getByText("Try adjusting your filters or search.")).toBeInTheDocument();
    emptyView.unmount();

    render(createElement(StoryGrid, { stories: [sampleStory], isLoading: false }));
    expect(screen.getByText("Building in Japan")).toBeInTheDocument();
  });

  it("renders the dashboard skeleton and story card skeleton", () => {
    const dashboardSkeleton = render(createElement(DashboardSkeleton));
    expect(dashboardSkeleton.container.querySelectorAll(".rounded-xl").length).toBeGreaterThanOrEqual(10);
    dashboardSkeleton.unmount();

    const storySkeleton = render(createElement(StoryCardSkeleton));
    expect(storySkeleton.container.querySelectorAll(".rounded-xl")).toHaveLength(1);
  });

  it("renders story timestamps as relative text", async () => {
    render(createElement(StoryCard, { story: sampleStory }));
    await waitFor(() =>
      expect(screen.getByText((content) => content.includes("ago"))).toBeInTheDocument()
    );
  });
});
