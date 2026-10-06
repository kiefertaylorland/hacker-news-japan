import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SavedStories } from "@/components/saved/SavedStories";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { authUser, sampleStory, makeStory } from "../../fixtures/stories";
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
    render(createElement(SavedStories, { user: authUser, stories: [], recommendations: [] }));
    expect(screen.getByText("No saved stories yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to search/ })).toHaveAttribute("href", "/");
    expect(screen.getByText("Save stories to get recommendations")).toBeInTheDocument();
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
    render(createElement(SavedStories, { user: authUser, stories: [sampleStory], recommendations: [] }));
    expect(screen.getByText("No recommendations yet")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove bookmark" }));

    // Removed immediately while the server action is still pending.
    await waitFor(() => expect(screen.getByText("No saved stories yet")).toBeInTheDocument());
    expect(builder.delete).toHaveBeenCalled();
    finishDelete();
    // After settling, the (unchanged) prop list is shown again until the page revalidates.
    await waitFor(() => expect(screen.getByText("Building in Japan")).toBeInTheDocument());
  });

  it("saves a recommendation through the existing bookmark action and refreshes /saved", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { from, builder } = mockQueryBuilder({ error: null });
    mockedCreateClient.mockResolvedValue({ from } as never);
    let finishSave: () => void = () => {};
    builder.upsert.mockImplementation(() => new Promise((resolve) => {
      finishSave = () => resolve({ error: null });
    }));
    const recommendation = makeStory({ objectID: "456", title: "Robotics in Japan" });
    render(createElement(SavedStories, { user: authUser, stories: [sampleStory], recommendations: [recommendation] }));
    expect(screen.getByText(recommendation.title)).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Save story" }));
    await waitFor(() => expect(screen.queryByText(recommendation.title)).not.toBeInTheDocument());
    expect(builder.upsert).toHaveBeenCalledWith(expect.objectContaining({ object_id: "456", user_id: authUser.id }), expect.anything());
    finishSave();
    const { revalidatePath } = await import("next/cache");
    await waitFor(() => expect(revalidatePath).toHaveBeenCalledWith("/saved"));
  });
});
