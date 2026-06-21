import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

describe("shared UI components", () => {
  it("renders button and badge variants", () => {
    const { rerender } = render(createElement(Button, null, "Default button"));
    expect(screen.getByRole("button", { name: "Default button" })).toBeInTheDocument();
    expect(buttonVariants({ variant: "link", size: "sm" })).toContain("underline");

    rerender(
      createElement(
        Button,
        { asChild: true, variant: "outline", size: "icon" },
        createElement("a", { href: "/docs" }, "Linked button")
      )
    );
    expect(screen.getByRole("link", { name: "Linked button" })).toHaveAttribute("href", "/docs");

    rerender(createElement(Badge, { variant: "outline" }, "Outline badge"));
    expect(screen.getByText("Outline badge")).toBeInTheDocument();
  });

  it("renders card and empty building blocks", () => {
    render(
      createElement(
        "div",
        null,
        createElement(
          Card,
          null,
          createElement(
            CardHeader,
            null,
            createElement(CardTitle, null, "Card title"),
            createElement(CardDescription, null, "Card description")
          ),
          createElement(CardContent, null, "Card content"),
          createElement(CardFooter, null, "Card footer")
        ),
        createElement(
          Empty,
          null,
          createElement(
            EmptyHeader,
            null,
            createElement(EmptyMedia, null, "Default media"),
            createElement(EmptyMedia, { variant: "icon" }, "Icon media"),
            createElement(EmptyTitle, null, "Nothing here"),
            createElement(EmptyDescription, null, "Try again later")
          ),
          createElement(EmptyContent, null, "Actions")
        )
      )
    );

    expect(screen.getByText("Card description")).toBeInTheDocument();
    expect(screen.getByText("Card footer")).toBeInTheDocument();
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders input, textarea, and input group controls", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      createElement(
        "div",
        null,
        createElement(Input, { "aria-label": "Plain input", type: "email" }),
        createElement(Textarea, { "aria-label": "Plain textarea" })
      )
    );

    expect(screen.getByLabelText("Plain input")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Plain textarea")).toBeInTheDocument();

    const buttonClick = vi.fn();
    rerender(
      createElement(
        InputGroup,
        null,
        createElement(InputGroupAddon, { "data-testid": "addon" }, "Prefix"),
        createElement(InputGroupInput, { "aria-label": "Grouped input" }),
        createElement(
          InputGroupAddon,
          { align: "inline-end" },
          createElement(InputGroupButton, { onClick: buttonClick }, "Go")
        )
      )
    );

    fireEvent.click(screen.getByTestId("addon"));
    expect(screen.getByLabelText("Grouped input")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(buttonClick).toHaveBeenCalled();

    rerender(
      createElement(
        InputGroup,
        null,
        createElement(
          InputGroupAddon,
          { align: "block-start" },
          createElement(InputGroupText, null, "Label")
        ),
        createElement(InputGroupTextarea, { "aria-label": "Grouped textarea" }),
        createElement(InputGroupAddon, { align: "block-end" }, "Footer")
      )
    );

    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByLabelText("Grouped textarea")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("renders select primitives for both content positions", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    const { rerender } = render(
      createElement(
        Select,
        { onValueChange },
        createElement(SelectTrigger, null, createElement(SelectValue, { placeholder: "Pick one" })),
        createElement(
          SelectContent,
          null,
          createElement(
            SelectGroup,
            null,
            createElement(SelectLabel, null, "Group A"),
            createElement(SelectItem, { value: "one" }, "One"),
            createElement(SelectSeparator),
            createElement(SelectItem, { value: "two" }, "Two")
          )
        )
      )
    );

    await user.click(screen.getByRole("combobox"));
    expect(await screen.findByText("Group A")).toBeInTheDocument();
    await user.click(screen.getByText("Two"));
    expect(onValueChange).toHaveBeenCalledWith("two");

    rerender(
      createElement(
        Select,
        { defaultValue: "one" },
        createElement(SelectTrigger, null, createElement(SelectValue)),
        createElement(
          SelectContent,
          { position: "item-aligned" },
          createElement(SelectItem, { value: "one" }, "One")
        )
      )
    );

    await user.click(screen.getByRole("combobox"));
    expect(screen.getAllByText("One")).not.toHaveLength(0);
  });

  it("renders pagination primitives", () => {
    render(
      createElement(
        Pagination,
        null,
        createElement(
          PaginationContent,
          null,
          createElement(PaginationItem, null, createElement(PaginationPrevious, { href: "#prev" })),
          createElement(
            PaginationItem,
            null,
            createElement(PaginationLink, { href: "#1", isActive: true }, "1")
          ),
          createElement(PaginationItem, null, createElement(PaginationNext, { href: "#next" })),
          createElement(PaginationItem, null, createElement(PaginationEllipsis))
        )
      )
    );

    expect(screen.getByRole("navigation", { name: "pagination" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to previous page" })).toHaveAttribute(
      "href",
      "#prev"
    );
    expect(screen.getByRole("link", { name: "Go to next page" })).toHaveAttribute("href", "#next");
    expect(screen.getByText("More pages")).toHaveClass("sr-only");
  });

  it("renders separators, skeleton, and toggles", async () => {
    const user = userEvent.setup();
    render(
      createElement(
        "div",
        null,
        createElement(Separator, { "data-testid": "horizontal-separator" }),
        createElement(Separator, {
          "data-testid": "vertical-separator",
          orientation: "vertical",
          decorative: false,
        }),
        createElement(Skeleton, { "data-testid": "skeleton" }),
        createElement(
          Toggle,
          { "aria-label": "Standalone toggle", variant: "outline", size: "sm" },
          "Toggle me"
        ),
        createElement(
          ToggleGroup,
          { type: "single", variant: "outline", size: "sm" },
          createElement(ToggleGroupItem, { value: "a" }, "A")
        ),
        createElement(
          ToggleGroup,
          { type: "single" },
          createElement(ToggleGroupItem, { value: "b", variant: "outline", size: "lg" }, "B")
        )
      )
    );

    expect(screen.getByTestId("horizontal-separator")).toHaveAttribute("data-orientation", "horizontal");
    expect(screen.getByTestId("vertical-separator")).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Standalone toggle" }));
    await user.click(screen.getByRole("radio", { name: "A" }));
    await user.click(screen.getByRole("radio", { name: "B" }));
    expect(screen.getByRole("radio", { name: "B" })).toBeInTheDocument();
  });

  it("renders tooltip content", async () => {
    const user = userEvent.setup();

    render(
      createElement(
        TooltipProvider,
        { delayDuration: 0 },
        createElement(
          Tooltip,
          null,
          createElement(
            TooltipTrigger,
            { asChild: true },
            createElement("button", { type: "button" }, "Hover me")
          ),
          createElement(TooltipContent, null, "Tooltip body")
        )
      )
    );

    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    expect(await screen.findByRole("tooltip")).toBeInTheDocument();
  });
});
