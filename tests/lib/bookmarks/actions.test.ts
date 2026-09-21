import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { toggleBookmark } from "@/lib/bookmarks/actions";
import { getCurrentUser } from "@/lib/auth/user";
import { setBookmark } from "@/lib/bookmarks/queries";
import { authUser, sampleStory as story } from "../../fixtures/stories";

vi.mock("next/navigation", () => import("../../helpers/mockNext").then((m) => m.navigationMock()));
vi.mock("next/cache", () => import("../../helpers/mockNext").then((m) => m.cacheMock()));
vi.mock("@/lib/bookmarks/queries", () => ({ setBookmark: vi.fn() }));
vi.mock("@/lib/auth/user", () => ({ getCurrentUser: vi.fn() }));

const mockedSetBookmark = vi.mocked(setBookmark);
const mockedGetCurrentUser = vi.mocked(getCurrentUser);

beforeEach(() => {
  mockedSetBookmark.mockReset();
  mockedGetCurrentUser.mockReset();
});

describe("toggleBookmark", () => {
  it("redirects anonymous users", async () => {
    mockedGetCurrentUser.mockResolvedValue(null);
    await expect(toggleBookmark(story, false)).rejects.toThrow("REDIRECT:/?auth_error=1");
  });

  it.each([false, true])("writes the bookmark (isSaved=%s) and revalidates both pages", async (isSaved) => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    await toggleBookmark(story, isSaved);
    expect(mockedSetBookmark).toHaveBeenCalledWith(story, "user-1", isSaved);
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/saved");
  });

  it("propagates write failures without revalidating", async () => {
    mockedGetCurrentUser.mockResolvedValue(authUser);
    mockedSetBookmark.mockRejectedValue(new Error("Could not update bookmark: rls"));
    await expect(toggleBookmark(story, false)).rejects.toThrow("Could not update bookmark: rls");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
