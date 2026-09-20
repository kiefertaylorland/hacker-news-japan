import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard/Dashboard", () => ({
  Dashboard: () => createElement("div", null, "Dashboard content"),
}));

vi.mock("@/components/dashboard/DashboardSkeleton", () => ({
  DashboardSkeleton: () => createElement("div", null, "Dashboard skeleton"),
}));

vi.mock("@/lib/auth/user", () => ({
  getCurrentUser: vi.fn(async () => ({ id: "user-1", name: "octocat", avatarUrl: null })),
}));

vi.mock("@/lib/bookmarks", () => ({
  getBookmarkIds: vi.fn(async () => ["1"]),
}));

import Loading from "@/app/loading";
import RootLayout, { metadata } from "@/app/layout";
import Home from "@/app/page";
import { getCurrentUser } from "@/lib/auth/user";
import { getBookmarkIds } from "@/lib/bookmarks";

describe("app entry points", () => {
  it("renders the home page with the current user's bookmarks", async () => {
    render(await Home());
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(getBookmarkIds).toHaveBeenCalledWith("user-1");
  });

  it("renders the home page for anonymous visitors", async () => {
    vi.mocked(getCurrentUser).mockResolvedValueOnce(null);
    render(await Home());
    expect(getBookmarkIds).toHaveBeenCalledWith(null);
  });

  it("renders the loading page", () => {
    render(createElement(Loading));
    expect(screen.getByText("Dashboard skeleton")).toBeInTheDocument();
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
