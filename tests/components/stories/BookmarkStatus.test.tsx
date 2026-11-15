import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { BookmarkStatus } from "@/components/stories/BookmarkStatus";

describe("BookmarkStatus", () => {
  it("announces progress and returns focus to restored bookmarks without interrupting another task", () => {
    const view = (errors: Record<string, string>) => <><button id="bookmark-123">Bookmark</button><h1 id="saved-heading" tabIndex={-1}>Saved</h1><input aria-label="Other task" /><BookmarkStatus message="Saving story…" errors={errors} visibleIds={["123"]} onRetry={vi.fn()} /></>;
    const { rerender } = render(view({}));
    expect(screen.getByRole("status")).toHaveTextContent("Saving story…");
    rerender(view({ "123": "failed" }));
    expect(screen.getByRole("button")).toHaveFocus();
    rerender(view({}));
    screen.getByRole("heading").focus();
    rerender(view({ "123": "failed again" }));
    expect(screen.getByRole("button")).toHaveFocus();
    rerender(view({}));
    screen.getByRole("textbox").focus();
    rerender(view({ "123": "failure while typing" }));
    expect(screen.getByRole("textbox")).toHaveFocus();
    rerender(view({ "123": "unchanged" }));
    expect(screen.getByRole("textbox")).toHaveFocus();
  });
  it("offers an accessible retry for a failed story that is no longer in the current results", async () => {
    const retry = vi.fn();
    const { rerender } = render(<BookmarkStatus message="" errors={{}} visibleIds={[]} onRetry={retry} />);
    rerender(<BookmarkStatus message="" errors={{ missing: "failed" }} visibleIds={[]} onRetry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("failed");
    expect(screen.getByRole("button", { name: "Retry bookmark" })).toHaveFocus();
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry bookmark" }));
    expect(retry).toHaveBeenCalledWith("missing");
  });
});
