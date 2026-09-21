import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as callback } from "@/app/auth/callback/route";
import { createClient } from "@/lib/supabase/server";
import { mockAuthClient } from "../helpers/mockSupabase";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

const auth = mockAuthClient();

beforeEach(() => {
  auth.exchangeCodeForSession.mockReset();
  vi.mocked(createClient).mockResolvedValue({ auth } as never);
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
    vi.stubEnv("NODE_ENV", "development");
    auth.exchangeCodeForSession.mockResolvedValue({ error: null });
    const response = await callback(
      new Request("http://localhost:3000/auth/callback?code=abc", {
        headers: { "x-forwarded-host": "hnj.vercel.app" },
      })
    );
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    vi.stubEnv("NODE_ENV", "test");
  });

  it("redirects home with an error when the code is missing or invalid", async () => {
    const missing = await callback(new Request("http://localhost:3000/auth/callback"));
    expect(missing.headers.get("location")).toBe("http://localhost:3000/?auth_error=1");

    auth.exchangeCodeForSession.mockResolvedValue({ error: { message: "bad code" } });
    const invalid = await callback(new Request("http://localhost:3000/auth/callback?code=bad"));
    expect(invalid.headers.get("location")).toBe("http://localhost:3000/?auth_error=1");
  });
});
