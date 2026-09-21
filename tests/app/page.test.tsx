import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AlgoliaResponse } from "@/lib/types";
import { sampleResults } from "../fixtures/stories";
import { renderServerPage } from "../helpers/renderServerPage";

const dashboardMock = vi.fn(
  ({
    authError,
    initialResults,
    savedIds,
  }: {
    authError?: boolean;
    initialResults?: AlgoliaResponse | null;
    savedIds?: string[] | Promise<string[]>;
  }) =>
    createElement(
      "div",
      null,
      authError ? "Dashboard content (auth error)" : "Dashboard content",
      initialResults ? ` with ${initialResults.hits.length} stories` : " without stories",
      savedIds instanceof Promise ? " (bookmarks streaming)" : " (no bookmarks)"
    )
);

vi.mock("@/components/dashboard/Dashboard", () => ({
  Dashboard: (props: never) => dashboardMock(props),
}));

vi.mock("@/components/dashboard/DashboardSkeleton", () => ({
  DashboardSkeleton: () => createElement("div", null, "Dashboard skeleton"),
}));

vi.mock("@/lib/auth/user", () => ({
  getCurrentUser: vi.fn(async () => ({ id: "user-1", name: "octocat", avatarUrl: null })),
}));

vi.mock("@/lib/bookmarks/queries", () => ({
  getBookmarkIds: vi.fn(async () => ["1"]),
}));

vi.mock("@/lib/search/cached", () => ({
  getCachedStories: vi.fn(),
}));

import Loading from "@/app/loading";
import RootLayout, { metadata } from "@/app/layout";
import Home from "@/app/page";
import { getCurrentUser } from "@/lib/auth/user";
import { getBookmarkIds } from "@/lib/bookmarks/queries";
import { getCachedStories } from "@/lib/search/cached";

describe("app entry points", () => {
  beforeEach(() => {
    vi.mocked(getCachedStories).mockReset().mockResolvedValue(sampleResults);
    dashboardMock.mockClear();
  });

  it("renders the home page with the current user's bookmarks and cached stories", async () => {
    await renderServerPage(Home({}));
    expect(screen.getByText("Dashboard content with 1 stories (bookmarks streaming)")).toBeInTheDocument();
    expect(getBookmarkIds).toHaveBeenCalledWith("user-1");
    expect(getCachedStories).toHaveBeenCalledWith({
      query: "",
      storyType: "all",
      dateRange: "all",
      sortBy: "date_desc",
      page: 0,
    });
  });

  it("renders the home page for anonymous visitors using the URL search params", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    await renderServerPage(Home({ searchParams: Promise.resolve({ query: "tokyo", page: ["2"] }) }));
    expect(screen.getByText("Dashboard content with 1 stories (no bookmarks)")).toBeInTheDocument();
    expect(getBookmarkIds).not.toHaveBeenCalled();
    expect(getCachedStories).toHaveBeenCalledWith(expect.objectContaining({ query: "tokyo", page: 2 }));
    // Anonymous visitors get an empty saved-ids array, not a pending bookmarks promise.
    expect(dashboardMock.mock.calls[0][0].savedIds).toEqual([]);
  });

  it("falls back to client fetching when the cached story fetch fails", async () => {
    vi.mocked(getCachedStories).mockRejectedValueOnce(new Error("Algolia API error: 500"));
    await renderServerPage(Home({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/^Dashboard content without stories/)).toBeInTheDocument();
    // The Dashboard prop is explicitly null (not undefined) so it can fetch client-side.
    expect(dashboardMock.mock.calls[0][0].initialResults).toBeNull();
  });

  it("passes a failed sign-in flag through to the dashboard", async () => {
    await renderServerPage(Home({ searchParams: Promise.resolve({ auth_error: "1" }) }));
    expect(screen.getByText(/^Dashboard content \(auth error\) with 1 stories/)).toBeInTheDocument();
  });

  it("renders the loading page and the home shell fallback", () => {
    render(createElement(Loading));
    render(Home({}).props.fallback);
    expect(screen.getAllByText("Dashboard skeleton")).toHaveLength(2);
  });

  it("renders the root layout and exports metadata", () => {
    const markup = renderToStaticMarkup(
      createElement(RootLayout, null, createElement("main", null, "Child content"))
    );

    expect(markup).toContain('lang="en"');
    expect(markup).toContain("dark scroll-smooth");
    expect(markup).toContain("font-sans antialiased");
    expect(markup).toContain("Child content");

    expect(metadata.title).toBe("Hacker News Japan");
    expect(metadata.description).toContain("Japan");
    expect(metadata.icons).toMatchObject({ icon: expect.stringContaining("🇯🇵") });
  });
});
