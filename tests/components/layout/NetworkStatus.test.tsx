import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NetworkStatus } from "@/components/layout/NetworkStatus";
import { renderToString } from "react-dom/server";

describe("NetworkStatus", () => {
  it("does not prerender a false offline warning before client connectivity is known", () => {
    expect(renderToString(<NetworkStatus />)).not.toContain("appear to be offline");
  });
  it("shows detected offline status and removes it on reconnect, cleaning up listeners", () => {
    const online = vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<NetworkStatus />);
    expect(screen.getByRole("alert")).toHaveTextContent("keep reading loaded stories");
    online.mockReturnValue(true);
    act(() => window.dispatchEvent(new Event("online")));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    online.mockReturnValue(false);
    act(() => window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("alert")).toBeInTheDocument();
    unmount();
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
