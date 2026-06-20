import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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
    const { rerender } = render(<Button>Default button</Button>);
    expect(screen.getByRole("button", { name: "Default button" })).toBeInTheDocument();
    expect(buttonVariants({ variant: "link", size: "sm" })).toContain("underline");

    rerender(
      <Button asChild variant="outline" size="icon">
        <a href="/docs">Linked button</a>
      </Button>
    );
    expect(screen.getByRole("link", { name: "Linked button" })).toHaveAttribute("href", "/docs");

    rerender(<Badge variant="outline">Outline badge</Badge>);
    expect(screen.getByText("Outline badge")).toBeInTheDocument();
  });

  it("renders card and empty building blocks", () => {
    render(
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Card title</CardTitle>
            <CardDescription>Card description</CardDescription>
          </CardHeader>
          <CardContent>Card content</CardContent>
          <CardFooter>Card footer</CardFooter>
        </Card>

        <Empty>
          <EmptyHeader>
            <EmptyMedia>Default media</EmptyMedia>
            <EmptyMedia variant="icon">Icon media</EmptyMedia>
            <EmptyTitle>Nothing here</EmptyTitle>
            <EmptyDescription>Try again later</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>Actions</EmptyContent>
        </Empty>
      </div>
    );

    expect(screen.getByText("Card description")).toBeInTheDocument();
    expect(screen.getByText("Card footer")).toBeInTheDocument();
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("renders input, textarea, and input group controls", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <div>
        <Input aria-label="Plain input" type="email" />
        <Textarea aria-label="Plain textarea" />
      </div>
    );

    expect(screen.getByLabelText("Plain input")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Plain textarea")).toBeInTheDocument();

    const buttonClick = vi.fn();
    rerender(
      <InputGroup>
        <InputGroupAddon data-testid="addon">Prefix</InputGroupAddon>
        <InputGroupInput aria-label="Grouped input" />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-sm" onClick={buttonClick}>
            Go
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    );

    fireEvent.click(screen.getByTestId("addon"));
    expect(screen.getByLabelText("Grouped input")).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Go" }));
    expect(buttonClick).toHaveBeenCalled();

    rerender(
      <InputGroup>
        <InputGroupAddon align="block-start">
          <InputGroupText>Label</InputGroupText>
        </InputGroupAddon>
        <InputGroupTextarea aria-label="Grouped textarea" />
        <InputGroupAddon align="block-end">Footer</InputGroupAddon>
      </InputGroup>
    );

    expect(screen.getByText("Label")).toBeInTheDocument();
    expect(screen.getByLabelText("Grouped textarea")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("renders select primitives for both content positions", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    const { rerender } = render(
      <Select onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="Pick one" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Group A</SelectLabel>
            <SelectItem value="one">One</SelectItem>
            <SelectSeparator />
            <SelectItem value="two">Two</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );

    await user.click(screen.getByRole("combobox"));
    expect(screen.getByText("Group A")).toBeInTheDocument();
    await user.click(screen.getByText("Two"));
    expect(onValueChange).toHaveBeenCalledWith("two");

    rerender(
      <Select defaultValue="one">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent position="item-aligned">
          <SelectItem value="one">One</SelectItem>
        </SelectContent>
      </Select>
    );

    await user.click(screen.getByRole("combobox"));
    expect(screen.getAllByText("One")).not.toHaveLength(0);
  });

  it("renders pagination primitives", () => {
    render(
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#prev" />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink href="#1" isActive>
              1
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext href="#next" />
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
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
      <div>
        <Separator data-testid="horizontal-separator" />
        <Separator data-testid="vertical-separator" orientation="vertical" decorative={false} />
        <Skeleton data-testid="skeleton" />
        <Toggle aria-label="Standalone toggle" variant="outline" size="sm">
          Toggle me
        </Toggle>
        <ToggleGroup type="single" variant="outline" size="sm">
          <ToggleGroupItem value="a">A</ToggleGroupItem>
        </ToggleGroup>
        <ToggleGroup type="single">
          <ToggleGroupItem value="b" variant="outline" size="lg">
            B
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    );

    expect(screen.getByTestId("horizontal-separator")).toHaveAttribute("data-orientation", "horizontal");
    expect(screen.getByTestId("vertical-separator")).toHaveAttribute("data-orientation", "vertical");
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Standalone toggle" }));
    await user.click(screen.getByRole("button", { name: "A" }));
    await user.click(screen.getByRole("button", { name: "B" }));
    expect(screen.getByRole("button", { name: "B" })).toBeInTheDocument();
  });

  it("renders tooltip content", async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button">Hover me</button>
          </TooltipTrigger>
          <TooltipContent>Tooltip body</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    await user.hover(screen.getByRole("button", { name: "Hover me" }));
    expect(await screen.findByText("Tooltip body")).toBeInTheDocument();
  });
});
