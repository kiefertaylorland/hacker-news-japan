import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signInWithGitHub, signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { mockAuthClient } from "../helpers/mockSupabase";

const headerValues = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: (name: string) => headerValues.get(name) ?? null })),
}));
vi.mock("next/navigation", () => import("../helpers/mockNext").then((m) => m.navigationMock()));
vi.mock("next/cache", () => import("../helpers/mockNext").then((m) => m.cacheMock()));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const auth = mockAuthClient();

beforeEach(() => {
  headerValues.clear();
  Object.values(auth).forEach((fn) => fn.mockReset());
  vi.mocked(createClient).mockResolvedValue({ auth } as never);
});

describe("signInWithGitHub", () => {
  it("redirects to the GitHub authorization url with a sanitized next path", async () => {
    headerValues.set("host", "localhost:3000");
    auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://github.com/login/oauth" }, error: null });
    const formData = new FormData();
    formData.set("next", "/saved");

    await expect(signInWithGitHub(formData)).rejects.toThrow("REDIRECT:https://github.com/login/oauth");
    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: "github",
      options: {
        redirectTo: "http://localhost:3000/auth/callback?next=%2Fsaved",
        skipBrowserRedirect: true,
      },
    });
  });

  it("defaults next to the home page when no form data is given", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://github.com/login/oauth" }, error: null });
    await expect(signInWithGitHub()).rejects.toThrow("REDIRECT:");
    expect(auth.signInWithOAuth.mock.calls[0][0].options.redirectTo).toContain("next=%2F");
  });

  it.each([
    ["the provider returns an error", { data: { url: null }, error: { message: "nope" } }],
    ["no url is returned", { data: { url: null }, error: null }],
  ])("redirects home with an error flag when %s", async (_label, result) => {
    auth.signInWithOAuth.mockResolvedValue(result);
    await expect(signInWithGitHub()).rejects.toThrow("REDIRECT:/?auth_error=1");
  });
});

describe("signOut", () => {
  it("signs out, revalidates the layout, and redirects home", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("REDIRECT:/");
    expect(auth.signOut).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
