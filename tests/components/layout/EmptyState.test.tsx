import { render } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/layout/EmptyState";

describe("EmptyState", () => {
  it("applies the dashed-border empty-state styling alongside a custom className", () => {
    const { container } = render(
      createElement(EmptyState, {
        icon: createElement("svg"),
        title: "Nothing here",
        description: "Try again later.",
        className: "extra-class",
      })
    );
    const empty = container.querySelector('[data-slot="empty"]');
    expect(empty).toHaveClass("border", "border-dashed", "border-white/10", "bg-white/[0.02]", "extra-class");
  });
});
