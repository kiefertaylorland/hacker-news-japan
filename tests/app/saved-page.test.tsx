import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SavedPage, { metadata } from "@/app/saved/page";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { authUser, sampleBookmarkRow } from "../fixtures/stories";
import { mockQueryBuilder } from "../helpers/mockSupabase";
import { renderServerPage } from "../helpers/renderServerPage";

vi.mock("@/app/auth/actions", () => import("../helpers/mockNext").then((m) => m.authActionsMock()));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));

const mockedGetCurrentUser = vi.mocked(getCurrentUser);

beforeEach(() => {
  mockedGetCurrentUser.mockReset();
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
  });

  it("renders the user's saved stories", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { from } = mockQueryBuilder({ data: [sampleBookmarkRow] });
    vi.mocked(createClient).mockResolvedValue({ from } as never);
    await renderServerPage(SavedPage());
    expect(screen.getByRole("heading", { name: "Saved stories" })).toBeInTheDocument();
    expect(screen.getByText("Building in Japan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
  });
});
