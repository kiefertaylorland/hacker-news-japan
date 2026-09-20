import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin, sanitizeNextPath } from "@/lib/auth/origin";
import { getCurrentUser } from "@/lib/auth/user";
import { signInWithGitHub, signOut } from "@/app/auth/actions";
import { GET as callback } from "@/app/auth/callback/route";
import { UserMenu } from "@/components/auth/UserMenu";

const headerValues = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: (name: string) => headerValues.get(name) ?? null })),
}));

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

const mockedCreateClient = vi.mocked(createClient);
const auth = {
  getClaims: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  exchangeCodeForSession: vi.fn(),
};

beforeEach(() => {
  headerValues.clear();
  Object.values(auth).forEach((fn) => fn.mockReset());
  mockedCreateClient.mockResolvedValue({ auth } as never);
});

describe("request origin helpers", () => {
  it("prefers forwarded host and proto headers", async () => {
    headerValues.set("x-forwarded-host", "hnj.vercel.app");
    headerValues.set("x-forwarded-proto", "https");
    expect(await getRequestOrigin()).toBe("https://hnj.vercel.app");
  });

  it("falls back to host with http for localhost and https otherwise", async () => {
    headerValues.set("host", "localhost:3000");
    expect(await getRequestOrigin()).toBe("http://localhost:3000");

    headerValues.set("host", "example.com");
    expect(await getRequestOrigin()).toBe("https://example.com");
  });

  it("defaults to localhost when no host headers exist", async () => {
    expect(await getRequestOrigin()).toBe("http://localhost:3000");
  });

  it("only allows same-origin relative next paths", () => {
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath("https://evil.example")).toBe("/");
    expect(sanitizeNextPath("//evil.example")).toBe("/");
    expect(sanitizeNextPath("/saved")).toBe("/saved");
  });
});

describe("getCurrentUser", () => {
  it("returns null when there are no claims", async () => {
    auth.getClaims.mockResolvedValue({ data: null });
    expect(await getCurrentUser()).toBeNull();
  });

  it("maps claims to a slim user, trying each name source in order", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ user_metadata: { user_name: "octocat", avatar_url: "https://a/img.png" } }, "octocat"],
      [{ user_metadata: { preferred_username: "pref" } }, "pref"],
      [{ user_metadata: { full_name: "Full Name" } }, "Full Name"],
      [{ user_metadata: { name: "Name" } }, "Name"],
      [{ email: "me@example.com" }, "me@example.com"],
      [{ email: 42 }, "Signed in"],
    ];

    for (const [claims, expected] of cases) {
      auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", ...claims } } });
      const user = await getCurrentUser();
      expect(user).toMatchObject({ id: "user-1", name: expected });
    }

    auth.getClaims.mockResolvedValue({
      data: { claims: { sub: "user-1", user_metadata: { user_name: "octocat", avatar_url: "https://a/img.png" } } },
    });
    expect((await getCurrentUser())?.avatarUrl).toBe("https://a/img.png");
    auth.getClaims.mockResolvedValue({ data: { claims: { sub: "user-1", user_metadata: {} } } });
    expect((await getCurrentUser())?.avatarUrl).toBeNull();
  });
});

describe("auth server actions", () => {
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

  it("redirects home with an error flag when the provider call fails", async () => {
    auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: { message: "nope" } });
    await expect(signInWithGitHub()).rejects.toThrow("REDIRECT:/?auth_error=1");

    auth.signInWithOAuth.mockResolvedValue({ data: { url: null }, error: null });
    await expect(signInWithGitHub()).rejects.toThrow("REDIRECT:/?auth_error=1");
  });

  it("signs out, revalidates the layout, and redirects home", async () => {
    auth.signOut.mockResolvedValue({ error: null });
    await expect(signOut()).rejects.toThrow("REDIRECT:/");
    expect(auth.signOut).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith("/");
  });
});

describe("auth callback route", () => {
  it("exchanges the code and redirects to the requested path", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await callback(
      new Request("http://localhost:3000/auth/callback?code=abc&next=%2Fsaved")
    );
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(response.headers.get("location")).toBe("http://localhost:3000/saved");
  });

  it("honours the forwarded host outside development", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await callback(
      new Request("http://internal/auth/callback?code=abc", {
        headers: { "x-forwarded-host": "hnj.vercel.app" },
      })
    );
    expect(response.headers.get("location")).toBe("https://hnj.vercel.app/");
  });

  it("ignores the forwarded host in development", async () => {
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await callback(
      new Request("http://localhost:3000/auth/callback?code=abc", {
        headers: { "x-forwarded-host": "hnj.vercel.app" },
      })
    );
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    process.env.NODE_ENV = previousEnv;
  });

  it("redirects home with an error when the code is missing or invalid", async () => {
    const missing = await callback(new Request("http://localhost:3000/auth/callback"));
    expect(missing.headers.get("location")).toBe("http://localhost:3000/?auth_error=1");

    auth.exchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } });
    const invalid = await callback(new Request("http://localhost:3000/auth/callback?code=bad"));
    expect(invalid.headers.get("location")).toBe("http://localhost:3000/?auth_error=1");
  });
});

describe("UserMenu", () => {
  it("offers GitHub sign-in when signed out", () => {
    render(createElement(UserMenu, { user: null, next: "/saved" }));
    expect(screen.getByRole("button", { name: "Sign in with GitHub" })).toBeInTheDocument();
    expect(document.querySelector('input[name="next"]')).toHaveValue("/saved");
  });

  it("shows the user, a saved link, and sign-out when signed in", () => {
    const { rerender } = render(
      createElement(UserMenu, {
        user: { id: "1", name: "octocat", avatarUrl: "https://a/img.png" },
      })
    );
    expect(screen.getByText("octocat")).toBeInTheDocument();
    expect(document.querySelector("img")).toHaveAttribute("src", "https://a/img.png");
    expect(screen.getByRole("link", { name: "Saved" })).toHaveAttribute("href", "/saved");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();

    rerender(createElement(UserMenu, { user: { id: "1", name: "octocat", avatarUrl: null } }));
    expect(document.querySelector("img")).toBeNull();
  });
});
