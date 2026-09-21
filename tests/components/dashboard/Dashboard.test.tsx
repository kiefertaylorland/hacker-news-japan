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
    expect(screen.getByText("日本")).toBeInTheDocument();
    expect(screen.getByText("Request failed")).toBeInTheDocument();
    expect(screen.getByDisplayValue("tokyo")).toBeInTheDocument();
    expect(screen.getByText("Building in Japan")).toBeInTheDocument();
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Request failed");
    expect(screen.getByRole("status")).toHaveTextContent("matching");
  });

  it("renders the dashboard without errors or results", () => {
    useSearchMock.mockReturnValue(mockSearchState());

    render(createElement(Dashboard));

    expect(screen.queryByText("Request failed")).not.toBeInTheDocument();
    expect(screen.getByText("No stories found")).toBeInTheDocument();
  });

  it("announces loading while keeping previous results visible", () => {
    useSearchMock.mockReturnValue(mockSearchState({ results: sampleResults, isLoading: true }));
    render(createElement(Dashboard));
    expect(screen.getByRole("status")).toHaveTextContent("Loading stories");
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
    expect(container.querySelectorAll(".rounded-xl").length).toBeGreaterThanOrEqual(10);
  });
});
