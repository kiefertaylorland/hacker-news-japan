import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageShell } from "@/components/layout/PageShell";

describe("PageShell navigation", () => {
  it.each([
    ["/", "Search"],
    ["/saved", "Saved"],
    ["/profile", "Profile"],
  ])("identifies only the current page at %s", (activePage, label) => {
    render(<PageShell activePage={activePage}>Page content</PageShell>);
    const navigation = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(navigation).getByRole("link", { current: "page" })).toHaveAccessibleName(label);
    expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  });

  it("leaves navigation unselected on discussion pages", () => {
    render(<PageShell>Discussion</PageShell>);
    expect(screen.queryByRole("link", { current: "page" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip to content" })).toHaveAttribute("href", "#main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
  });
});
