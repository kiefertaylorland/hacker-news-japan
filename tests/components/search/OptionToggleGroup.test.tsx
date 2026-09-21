import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { OptionToggleGroup } from "@/components/search/OptionToggleGroup";

const options = [
  { label: "All", value: "all" },
  { label: "Story", value: "story" },
] as const;

describe("OptionToggleGroup", () => {
  it("applies the shared item classes and the group layout classes", () => {
    render(
      createElement(OptionToggleGroup, {
        options,
        value: "all",
        onChange: vi.fn(),
        ariaLabel: "Type",
        size: "md",
        className: "extra-class",
      })
    );

    const group = screen.getByRole("radiogroup", { name: "Type" });
    expect(group).toHaveClass("flex-wrap", "justify-start", "extra-class");

    const item = screen.getByRole("radio", { name: "All" });
    expect(item).toHaveClass(
      "h-11",
      "border",
      "border-white/10",
      "bg-white/5",
      "text-xs",
      "font-medium",
      "text-slate-400"
    );
  });
});
