import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Inter: () => ({ variable: "--font-inter" }),
  Noto_Sans_JP: () => ({ variable: "--font-noto-jp" }),
}));

vi.mock("@/components/dashboard/Dashboard", () => ({
  Dashboard: () => <div>Dashboard content</div>,
}));

vi.mock("@/components/dashboard/DashboardSkeleton", () => ({
  DashboardSkeleton: () => <div>Dashboard skeleton</div>,
}));

import Loading from "@/app/loading";
import RootLayout, { metadata } from "@/app/layout";
import Home from "@/app/page";

describe("app entry points", () => {
  it("renders the home page", () => {
    render(<Home />);
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("renders the loading page", () => {
    render(<Loading />);
    expect(screen.getByText("Dashboard skeleton")).toBeInTheDocument();
  });

  it("renders the root layout and exports metadata", () => {
    const markup = renderToStaticMarkup(
      <RootLayout>
        <main>Child content</main>
      </RootLayout>
    );

    expect(markup).toContain('lang="en"');
    expect(markup).toContain("dark scroll-smooth");
    expect(markup).toContain("--font-inter --font-noto-jp font-sans antialiased");
    expect(markup).toContain("Child content");

    expect(metadata.title).toBe("Hacker News Japan");
    expect(metadata.description).toContain("Japan");
    expect(metadata.icons?.icon).toContain("🇯🇵");
  });
});
