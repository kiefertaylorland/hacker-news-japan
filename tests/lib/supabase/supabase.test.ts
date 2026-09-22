import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { config, proxy } from "@/proxy";

const cookieStore = {
  getAll: vi.fn(),
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

const mockedCreateServerClient = vi.mocked(createServerClient);

type CookieMethods = {
  getAll: () => unknown;
  setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
};

function captureCookieMethods(
  onCookies?: (methods: CookieMethods) => void
): { getClaims: ReturnType<typeof vi.fn>; methods: () => CookieMethods } {
  const getClaims = vi.fn(async () => ({ data: null, error: null }));
  let captured: CookieMethods | undefined;
  mockedCreateServerClient.mockImplementation((_url, _key, options) => {
    captured = options.cookies as CookieMethods;
    onCookies?.(captured);
    return { auth: { getClaims } } as never;
  });
  return { getClaims, methods: () => captured as CookieMethods };
}

describe("supabase environment", () => {
  it("returns the configured url and publishable key", () => {
    expect(getSupabaseEnv()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "sb_publishable_test",
    });
  });

  it("throws a clear error when configuration is missing", () => {
    const previous = process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "";
    expect(() => getSupabaseEnv()).toThrow(/Missing Supabase configuration/);
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous;
  });
});

describe("supabase server client", () => {
  beforeEach(() => {
    cookieStore.getAll.mockReset();
    cookieStore.set.mockReset();
    mockedCreateServerClient.mockReset();
  });

  it("reads and writes cookies through next/headers", async () => {
    const { methods } = captureCookieMethods();
    cookieStore.getAll.mockReturnValue([{ name: "sb", value: "token" }]);

    await createServerSupabase();

    expect(methods().getAll()).toEqual([{ name: "sb", value: "token" }]);
    methods().setAll([{ name: "sb", value: "next", options: { path: "/" } }]);
    expect(cookieStore.set).toHaveBeenCalledWith("sb", "next", { path: "/" });
  });

  it("ignores cookie writes from read-only server components", async () => {
    const { methods } = captureCookieMethods();
    cookieStore.set.mockImplementation(() => {
      throw new Error("read-only");
    });

    await createServerSupabase();

    expect(() => methods().setAll([{ name: "sb", value: "v" }])).not.toThrow();
  });
});

describe("proxy", () => {
  beforeEach(() => {
    mockedCreateServerClient.mockReset();
  });

  it("refreshes the session and forwards cookies to the response", async () => {
    const { getClaims, methods } = captureCookieMethods();
    const request = new NextRequest("http://localhost:3000/", {
      headers: { cookie: "existing=1" },
    });

    const responsePromise = proxy(request);
    await responsePromise;
    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(methods().getAll()).toEqual([{ name: "existing", value: "1" }]);

    // Simulate the auth client rotating a token mid-request.
    mockedCreateServerClient.mockImplementation((_url, _key, options) => {
      (options.cookies as CookieMethods).setAll([
        { name: "sb-token", value: "rotated", options: { path: "/", httpOnly: true } },
      ]);
      return { auth: { getClaims } } as never;
    });
    const response = await proxy(new NextRequest("http://localhost:3000/saved"));

    expect(response.cookies.get("sb-token")?.value).toBe("rotated");
  });

  it("forwards the request into the response even when no cookies are rotated", async () => {
    // NextResponse.next({ request }) mirrors request.headers onto the response; this proves
    // the initial `response` assignment passes `request`, not `{}`, even when setAll never runs.
    captureCookieMethods();

    const response = await proxy(new NextRequest("http://localhost:3000/", { headers: { cookie: "existing=1" } }));

    expect(response.headers.get("x-middleware-override-headers")).toContain("cookie");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("existing=1");
  });

  it("forwards the (possibly cookie-updated) request into the response", async () => {
    // NextResponse.next({ request }) mirrors request.headers onto the response as
    // x-middleware-request-* / x-middleware-override-headers; this proves both that
    // `request` (not `{}`) was passed, and that the cookie mutation was applied to it.
    captureCookieMethods((cookies) => cookies.setAll([{ name: "sb-token", value: "rotated" }]));

    const response = await proxy(new NextRequest("http://localhost:3000/", { headers: { cookie: "existing=1" } }));

    expect(response.headers.get("x-middleware-override-headers")).toContain("cookie");
    expect(response.headers.get("x-middleware-request-cookie")).toContain("sb-token=rotated");
  });

  it("skips Next internals and static files but runs on pages", () => {
    // Next compiles the matcher with path-to-regexp; the pattern is a regex body it accepts as-is.
    const matcher = new RegExp(`^${config.matcher[0]}$`);
    for (const path of ["/", "/saved", "/auth/callback", "/?query=tokyo&page=1"]) {
      expect(path).toMatch(matcher);
    }
    for (const path of ["/_next/static/chunks/app.js", "/_next/image?url=x", "/_next/data/build/index.json", "/favicon.ico", "/robots.txt", "/sitemap.xml", "/styles.css", "/icon.png"]) {
      expect(path).not.toMatch(matcher);
    }
  });
});
