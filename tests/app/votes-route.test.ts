import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/votes/[id]/route";
import { loadVote } from "@/lib/votes/actions";
vi.mock("@/lib/votes/actions", () => ({ loadVote: vi.fn() }));
describe("vote state route", () => {
  it("returns private, uncached vote state", async () => {
    vi.mocked(loadVote).mockResolvedValue({ count: 2, voted: true }); const response = await GET(new Request("http://localhost/api/votes/123"), { params: Promise.resolve({ id: "123" }) });
    expect(await response.json()).toEqual({ count: 2, voted: true }); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("returns a retryable error without exposing backend details", async () => {
    vi.mocked(loadVote).mockRejectedValue(new Error("secret details")); const response = await GET(new Request("http://localhost/api/votes/123"), { params: Promise.resolve({ id: "123" }) });
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "Could not load votes" });
  });
});
