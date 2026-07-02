import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  Noto_Sans_JP: () => ({ variable: "--font-noto-jp" }),
}));

vi.mock("@/components/dashboard/Dashboard", () => ({
  Dashboard: () => createElement("div", null, "Dashboard content"),
}));

vi.mock("@/components/dashboard/DashboardSkeleton", () => ({
  DashboardSkeleton: () => createElement("div", null, "Dashboard skeleton"),
}));

import Loading from "@/app/loading";
import RootLayout, { metadata } from "@/app/layout";
import Home from "@/app/page";

describe("app entry points", () => {
  it("renders the home page", () => {
    render(createElement(Home));
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
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
    expect(markup).toContain("--font-inter --font-noto-jp font-sans antialiased");
    expect(markup).toContain("Child content");

    expect(metadata.title).toBe("Hacker News Japan");
    expect(metadata.description).toContain("Japan");
    expect(metadata.icons).toMatchObject({ icon: expect.stringContaining("🇯🇵") });
  });
});
