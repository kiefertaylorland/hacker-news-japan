import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/user";
import {
  getBookmarkIds,
  listBookmarks,
  toBookmarkRow,
  toHNStory,
  type BookmarkRow,
} from "@/lib/bookmarks/queries";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import SavedPage, { metadata } from "@/app/saved/page";
import { SavedStories } from "@/components/saved/SavedStories";
import type { HNStory } from "@/lib/types";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/user", () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock("@/app/auth/actions", () => ({
  signInWithGitHub: vi.fn(),
  signOut: vi.fn(),
}));

const mockedCreateClient = vi.mocked(createClient);
const mockedGetCurrentUser = vi.mocked(getCurrentUser);

const story: HNStory = {
  objectID: "123",
  title: "Building in Japan",
  url: "https://www.example.com/post",
  author: "alice",
  points: 42,
  num_comments: 7,
  created_at: "1970-01-01T00:00:10.000Z",
  created_at_i: 10,
  _tags: ["story"],
  story_id: 123,
};

const row: BookmarkRow = {
  user_id: "user-1",
  object_id: "123",
  title: "Building in Japan",
  url: "https://www.example.com/post",
  author: "alice",
  points: 42,
  num_comments: 7,
  created_at_i: 10,
  tags: ["story"],
};

const authUser = { id: "user-1", name: "octocat", avatarUrl: null };

function mockQuery(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.delete = vi.fn(chain);
  builder.upsert = vi.fn(async () => result);
  builder.then = vi.fn((resolve: (value: unknown) => unknown) => resolve(result));
  const from = vi.fn(() => builder);
  mockedCreateClient.mockResolvedValue({ from } as never);
  return { from, builder };
}

beforeEach(() => {
  mockedCreateClient.mockReset();
  mockedGetCurrentUser.mockReset();
});

describe("bookmark mappers", () => {
  it("round-trips a story through a bookmark row", () => {
    expect(toBookmarkRow(story, "user-1")).toEqual(row);
    expect(toHNStory(row)).toEqual(story);
  });
});

describe("bookmark queries", () => {
  it("returns no ids for anonymous users without touching the database", async () => {
    expect(await getBookmarkIds(null)).toEqual([]);
    expect(mockedCreateClient).not.toHaveBeenCalled();
  });

  it("lists saved ids for a user", async () => {
    const { from, builder } = mockQuery({ data: [{ object_id: "1" }, { object_id: "2" }] });
    expect(await getBookmarkIds("user-1")).toEqual(["1", "2"]);
    expect(from).toHaveBeenCalledWith("bookmarks");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");

    mockQuery({ data: null });
    expect(await getBookmarkIds("user-1")).toEqual([]);

    mockQuery({ data: null, error: { message: "down" } });
    await expect(getBookmarkIds("user-1")).rejects.toThrow("Could not load bookmarks: down");
  });

  it("lists bookmarks newest first as stories", async () => {
    const { builder } = mockQuery({ data: [row] });
    expect(await listBookmarks("user-1")).toEqual([story]);
    expect(builder.order).toHaveBeenCalledWith("saved_at", { ascending: false });

    mockQuery({ data: null });
    expect(await listBookmarks("user-1")).toEqual([]);

    mockQuery({ data: null, error: { message: "down" } });
    await expect(listBookmarks("user-1")).rejects.toThrow("Could not load bookmarks: down");
  });
});

describe("toggleBookmark", () => {
  it("redirects anonymous users", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);
    await expect(toggleBookmark(story, false)).rejects.toThrow("REDIRECT:/?auth_error=1");
  });

  it("upserts a bookmark idempotently and revalidates both pages", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { builder } = mockQuery({ error: null });
    await toggleBookmark(story, false);
    expect(builder.upsert).toHaveBeenCalledWith(row, {
      onConflict: "user_id,object_id",
      ignoreDuplicates: true,
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/saved");
  });

  it("deletes a saved bookmark", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { builder } = mockQuery({ error: null });
    await toggleBookmark(story, true);
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(builder.eq).toHaveBeenCalledWith("object_id", "123");
  });

  it("surfaces database errors", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    mockQuery({ error: { message: "rls" } });
    await expect(toggleBookmark(story, false)).rejects.toThrow("Could not update bookmark: rls");
  });
});

describe("saved page", () => {
  it("asks anonymous visitors to sign in", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);
    render(await SavedPage());
    expect(screen.getByText("Sign in to see saved stories")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
    expect(metadata.title).toContain("Saved");
  });

  it("renders the user's saved stories", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    mockQuery({ data: [row] });
    render(await SavedPage());
    expect(screen.getByRole("heading", { name: "Saved stories" })).toBeInTheDocument();
    expect(screen.getByText("Building in Japan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("SavedStories", () => {
  it("shows an empty state when nothing is saved", () => {
    render(createElement(SavedStories, { user: authUser, stories: [] }));
    expect(screen.getByText("No saved stories yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Back to search/ })).toHaveAttribute("href", "/");
  });

  it("optimistically removes a story when its bookmark is toggled", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    const { builder } = mockQuery({ error: null });
    let finishDelete: () => void = () => {};
    builder.then.mockImplementation((resolve: (value: unknown) => unknown) => {
      finishDelete = () => resolve({ error: null });
    });
    const user = userEvent.setup();
    render(createElement(SavedStories, { user: authUser, stories: [story] }));

    await user.click(screen.getByRole("button", { name: "Remove bookmark" }));

    // Removed immediately while the server action is still pending.
    await waitFor(() => expect(screen.getByText("No saved stories yet")).toBeInTheDocument());
    expect(builder.delete).toHaveBeenCalled();
    finishDelete();
    // After settling, the (unchanged) prop list is shown again until the page revalidates.
    await waitFor(() => expect(screen.getByText("Building in Japan")).toBeInTheDocument());
  });
});
