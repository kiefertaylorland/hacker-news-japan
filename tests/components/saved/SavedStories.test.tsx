import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SavedStories } from "@/components/saved/SavedStories";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { authUser, sampleStory } from "../../fixtures/stories";
import { mockQueryBuilder } from "../../helpers/mockSupabase";

vi.mock("next/navigation", () => import("../../helpers/mockNext").then((m) => m.navigationMock()));
vi.mock("next/cache", () => import("../../helpers/mockNext").then((m) => m.cacheMock()));
vi.mock("@/app/auth/actions", () => import("../../helpers/mockNext").then((m) => m.authActionsMock()));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const mockedGetCurrentUser = vi.mocked(getCurrentUser);

beforeEach(() => {
  mockedCreateClient.mockReset();
  mockedGetCurrentUser.mockReset();
});

describe("SavedStories", () => {
  it("shows an empty state when nothing is saved", () => {
    render(createElement(SavedStories, { user: authUser, stories: [] }));
    expect(screen.getByText("No saved stories yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to search/ })).toHaveAttribute("href", "/");
  });

  it("optimistically removes a story when its bookmark is toggled", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { from, builder } = mockQueryBuilder({ error: null });
    mockedCreateClient.mockResolvedValue({ from } as never);
    let finishDelete: () => void = () => {};
    builder.then.mockImplementation((resolve: (value: unknown) => unknown) => {
      finishDelete = () => resolve({ error: null });
    });
    const user = userEvent.setup();
    render(createElement(SavedStories, { user: authUser, stories: [sampleStory] }));

    await user.click(screen.getByRole("button", { name: "Remove bookmark" }));

    // Removed immediately while the server action is still pending.
    await waitFor(() => expect(screen.getByText("No saved stories yet")).toBeInTheDocument());
    expect(builder.delete).toHaveBeenCalled();
    finishDelete();
    // After settling, the (unchanged) prop list is shown again until the page revalidates.
    await waitFor(() => expect(screen.getByText("Building in Japan")).toBeInTheDocument());
  });
});
