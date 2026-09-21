import { describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/lib/auth/user";
import { createClient } from "@/lib/supabase/server";
import { withMockedAuthClient } from "../../helpers/mockSupabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const auth = withMockedAuthClient(vi.mocked(createClient));

describe("getCurrentUser", () => {
  it("returns null when there are no claims", async () => {
    auth.getClaims.mockResolvedValue({ data: null });
    expect(await getCurrentUser()).toBeNull();
  });

  it.each([
    [{ user_metadata: { user_name: "octocat", avatar_url: "https://a/img.png" } }, "octocat"],
    [{ user_metadata: { preferred_username: "pref" } }, "pref"],
    [{ user_metadata: { full_name: "Full Name" } }, "Full Name"],
    [{ user_metadata: { name: "Name" } }, "Name"],
    [{ email: "me@example.com" }, "me@example.com"],
    [{ email: 42 }, "Signed in"],
  ] as [Record<string, unknown>, string][])("derives the display name from %j", async (claims, expected) => {
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", ...claims } } });
    expect(await getCurrentUser()).toMatchObject({ id: "user-1", name: expected });
  });

  it("maps the avatar url when present", async () => {
    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", user_metadata: { user_name: "octocat", avatar_url: "https://a/img.png" } } },
    });
    expect((await getCurrentUser())?.avatarUrl).toBe("https://a/img.png");
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", user_metadata: {} } } });
    expect((await getCurrentUser())?.avatarUrl).toBeNull();
  });
});
