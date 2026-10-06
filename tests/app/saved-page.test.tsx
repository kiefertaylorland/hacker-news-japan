import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SavedPage, { metadata } from "@/app/saved/page";
import { getCurrentUser } from "@/lib/auth/user";
import { getRecommendedStories } from "@/lib/recommendations/stories";
import { createClient } from "@/lib/supabase/server";
import { authUser, sampleBookmarkRow, sampleStory, makeStory } from "../fixtures/stories";
import { mockQueryBuilder } from "../helpers/mockSupabase";
import { renderServerPage } from "../helpers/renderServerPage";

vi.mock("@/app/auth/actions", () => import("../helpers/mockNext").then((m) => m.authActionsMock()));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/recommendations/stories", () => ({ getRecommendedStories: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

beforeEach(() => {
  mockedGetCurrentUser.mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(getRecommendedStories).mockReset().mockResolvedValue([]);
});

describe("saved page", () => {
  it("asks anonymous visitors to sign in", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);
    render(SavedPage().props.fallback);
    expect(screen.getByRole("main")).toBeInTheDocument();
    await renderServerPage(SavedPage());
    expect(screen.getByText("Sign in to see saved stories")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
    expect(metadata.title).toContain("Saved");
    expect(createClient).not.toHaveBeenCalled();
    expect(getRecommendedStories).not.toHaveBeenCalled();
  });

  it("renders the user's saved stories", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { from, builder } = mockQueryBuilder({ data: [sampleBookmarkRow] });
    vi.mocked(createClient).mockResolvedValue({ from } as never);
    vi.mocked(getRecommendedStories).mockResolvedValue([makeStory({ objectID: "456", title: "Building robots in Japan" })]);
    await renderServerPage(SavedPage());
    expect(screen.getByRole("heading", { name: "Saved stories" })).toBeInTheDocument();
    expect(screen.getByText("Building in Japan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
    expect(builder.eq).toHaveBeenCalledWith("user_id", authUser.id);
    expect(getRecommendedStories).toHaveBeenCalledWith([sampleStory]);
    expect(screen.getByRole("heading", { name: "Recommended for you" })).toBeInTheDocument();
    expect(screen.getByText("Building robots in Japan")).toBeInTheDocument();
  });

  it("keeps saved stories available when recommendations fail", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { from } = mockQueryBuilder({ data: [sampleBookmarkRow] });
    vi.mocked(createClient).mockResolvedValue({ from } as never);
    vi.mocked(getRecommendedStories).mockRejectedValue(new Error("Algolia unavailable"));
    await renderServerPage(SavedPage());
    expect(screen.getByText(sampleStory.title)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load recommendations. Refresh the page to try again.");
  });
});
