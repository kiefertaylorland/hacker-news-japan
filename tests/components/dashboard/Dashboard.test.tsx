import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { useOptimisticBookmarks } from "@/hooks/useOptimisticBookmarks";
import type { HNStory } from "@/lib/types";
import { authUser, sampleResults, sampleStory } from "../../fixtures/stories";
import { mockSearchState } from "../../helpers/mockSearchState";

const useSearchMock = vi.fn();

vi.mock("@/hooks/useSearch", () => ({
  useSearch: (initialResults: unknown, initialParams: unknown) => useSearchMock(initialResults, initialParams),
}));

vi.mock("@/hooks/useOptimisticBookmarks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useOptimisticBookmarks")>();
  return { ...actual, useOptimisticBookmarks: vi.fn(actual.useOptimisticBookmarks) };
});

const mockedUseOptimisticBookmarks = vi.mocked(useOptimisticBookmarks);

const toggleBookmarkMock = vi.fn(async (_story: HNStory, _isSaved: boolean) => {});

vi.mock("@/lib/bookmarks/actions", () => ({
  toggleBookmark: (story: HNStory, isSaved: boolean) => toggleBookmarkMock(story, isSaved),
}));

vi.mock("@/app/auth/actions", () => import("../../helpers/mockNext").then((m) => m.authActionsMock()));

describe("Dashboard", () => {
  beforeEach(() => {
    useSearchMock.mockReset();
    toggleBookmarkMock.mockClear();
    mockedUseOptimisticBookmarks.mockClear();
  });

  it("defaults to an empty saved-ids set when no savedIds prop is given", () => {
    useSearchMock.mockReturnValue(mockSearchState({ results: sampleResults }));
    render(createElement(Dashboard, { user: authUser }));
    expect(mockedUseOptimisticBookmarks).toHaveBeenCalledWith([]);
  });

  it("renders the dashboard with results and an error", () => {
    useSearchMock.mockReturnValue(
      mockSearchState({
        query: "tokyo",
        storyType: "story",
        dateRange: "week",
        sortBy: "points",
        page: 1,
        results: sampleResults,
        error: "Request failed",
      })
    );

    render(createElement(Dashboard, { initialResults: sampleResults }));

    expect(useSearchMock).toHaveBeenCalledWith(sampleResults, undefined);
    expect(screen.getByRole("heading", { name: "日本" })).toBeInTheDocument();
    expect(screen.getByText("Request failed")).toBeInTheDocument();
    expect(screen.getByDisplayValue("tokyo")).toBeInTheDocument();
    expect(screen.getByText("Building in Japan")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Request failed");
    expect(screen.getByRole("alert")).toHaveTextContent("Could not refresh stories. Previous results are still shown below.");
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Previous results");
  });

  it("renders the dashboard without errors or results", () => {
    useSearchMock.mockReturnValue(mockSearchState());

    render(createElement(Dashboard));

    expect(screen.queryByText("Request failed")).not.toBeInTheDocument();
    expect(screen.getByText("No stories found")).toBeInTheDocument();
  });

  it("offers retry without presenting a request failure as an empty search", async () => {
    const state = mockSearchState({ error: "Request failed" });
    useSearchMock.mockReturnValue(state);
    render(<Dashboard />);
    expect(screen.getByText("Stories unavailable")).toBeInTheDocument();
    expect(screen.queryByText("No stories found")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters and browse stories" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).not.toHaveTextContent("Previous results are still shown below.");
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry search" }));
    expect(state.retry).toHaveBeenCalledOnce();
  });

  it("clears constraints from a completed empty search", async () => {
    const state = mockSearchState({ results: { ...sampleResults, hits: [], nbHits: 0, nbPages: 0 } });
    useSearchMock.mockReturnValue(state);
    render(<Dashboard />);
    await userEvent.setup().click(screen.getByRole("button", { name: "Clear filters and browse stories" }));
    expect(state.reset).toHaveBeenCalledOnce();
  });

  it.each([
    ["completed results", sampleResults, false, false],
    ["refreshing empty results", { ...sampleResults, hits: [] as HNStory[], nbHits: 0, nbPages: 0 }, true, false],
    ["completed empty results", { ...sampleResults, hits: [] as HNStory[], nbHits: 0, nbPages: 0 }, false, true],
  ] as const)("offers the empty-search recovery action only for %s when appropriate", (_label, results, isLoading, expected) => {
    useSearchMock.mockReturnValue(mockSearchState({ results, isLoading }));
    render(<Dashboard />);
    const action = screen.queryByRole("button", { name: "Clear filters and browse stories" });
    if (expected) expect(action).toBeInTheDocument();
    else expect(action).not.toBeInTheDocument();
  });

  it.each([
    ["settled", false, null, false],
    ["refreshing", true, null, true],
    ["failed refresh", false, "Could not fetch the next page", true],
  ] as const)("allows page changes only when the search is %s and usable", async (_label, isLoading, error, disabled) => {
    const state = mockSearchState({ results: { ...sampleResults, nbPages: 2, page: 0 }, isLoading, error });
    useSearchMock.mockReturnValue(state);
    render(<Dashboard />);
    const next = screen.getByRole("button", { name: "Next" });
    if (disabled) expect(next).toBeDisabled();
    else expect(next).toBeEnabled();
    await userEvent.setup().click(next);
    if (disabled) expect(state.setPage).not.toHaveBeenCalled();
    else expect(state.setPage).toHaveBeenCalledWith(1);
  });

  it("announces loading while keeping previous results visible", () => {
    useSearchMock.mockReturnValue(mockSearchState({ results: sampleResults, isLoading: true }));
    render(createElement(Dashboard));
    expect(screen.getAllByRole("status")[0]).toHaveTextContent("Loading stories");
    expect(screen.getByText("Building in Japan").closest("[aria-busy]")).toHaveAttribute("aria-busy", "true");
  });

  it("renders stories before streamed bookmarks resolve, then enables saving", async () => {
    useSearchMock.mockReturnValue(mockSearchState({ results: sampleResults }));
    let resolveIds: (ids: string[]) => void = () => {};
    const savedIds = new Promise<string[]>((resolve) => { resolveIds = resolve; });

    render(createElement(Dashboard, { user: authUser, savedIds }));
    expect(screen.getByText("Building in Japan")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bookmark|Save story/ })).not.toBeInTheDocument();

    await act(async () => resolveIds(["123"]));
    await waitFor(() => expect(screen.getByRole("button", { name: "Remove bookmark" })).toBeInTheDocument());
  });

  it("shows a notice when a sign-in attempt failed", () => {
    useSearchMock.mockReturnValue(mockSearchState());
    render(createElement(Dashboard, { authError: true }));
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in with GitHub didn't complete");
  });

  it("hides bookmarking for anonymous visitors and offers sign-in", () => {
    useSearchMock.mockReturnValue(mockSearchState({ results: sampleResults }));
    render(createElement(Dashboard));
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save story" })).not.toBeInTheDocument();
  });

  it("retries an inline bookmark failure through the dedicated failed operation", async () => {
    useSearchMock.mockReturnValue(mockSearchState({ results: sampleResults }));
    toggleBookmarkMock.mockRejectedValueOnce(new Error("response lost"));
    render(<Dashboard user={authUser} savedIds={[]} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Save story" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("previous saved state has been restored");
    await user.click(screen.getByRole("button", { name: "Retry bookmark" }));
    await waitFor(() => expect(toggleBookmarkMock).toHaveBeenCalledTimes(2));
    expect(toggleBookmarkMock).toHaveBeenLastCalledWith(sampleStory, false);
  });

  it("toggles bookmarks optimistically for signed-in users", async () => {
    useSearchMock.mockReturnValue(mockSearchState({ results: sampleResults }));
    let finishSave: () => void = () => {};
    toggleBookmarkMock.mockImplementationOnce(
      () => new Promise<void>((resolve) => { finishSave = resolve; })
    );
    const user = userEvent.setup();
    render(createElement(Dashboard, { user: authUser, savedIds: [] }));
    expect(screen.getByText("octocat")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save story" }));
    // While the server action is pending, the optimistic state shows the story as saved.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true")
    );
    expect(toggleBookmarkMock).toHaveBeenCalledWith(sampleStory, false);
    finishSave();

    // Once settled (and the page revalidated), the prop drives the state again.
    await waitFor(() => expect(screen.getByRole("button", { name: "Save story" })).toBeInTheDocument());

    cleanup();
    render(createElement(Dashboard, { user: authUser, savedIds: ["123"] }));
    await user.click(screen.getByRole("button", { name: "Remove bookmark" }));
    await waitFor(() => expect(toggleBookmarkMock).toHaveBeenCalledWith(sampleStory, true));
  });
});

describe("DashboardSkeleton", () => {
  it("renders header, control, and grid placeholders", () => {
    const { container } = render(createElement(DashboardSkeleton));
    expect(screen.getByRole("heading", { name: "日本" })).toBeInTheDocument();
    expect(screen.getByText("Japan")).toBeInTheDocument();
    expect(screen.getByText(/Browse, search, and filter/)).toBeInTheDocument();
    expect(container.querySelectorAll(".rounded-xl").length).toBeGreaterThanOrEqual(10);
  });
});
