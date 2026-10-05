import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/votes/route";
import { loadVotes } from "@/lib/votes/actions";
vi.mock("@/lib/votes/actions", () => ({ loadVotes: vi.fn() }));
describe("vote state route", () => {
  it("returns private, uncached vote state for every requested story", async () => {
    vi.mocked(loadVotes).mockResolvedValue({ "123": { count: 2, voted: true }, "456": { count: 0, voted: false } }); const response = await GET(new Request("http://localhost/api/votes?ids=123,456"));
    expect(loadVotes).toHaveBeenCalledWith(["123", "456"]); expect(await response.json()).toEqual({ "123": { count: 2, voted: true }, "456": { count: 0, voted: false } }); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("passes no ids through for validation when the parameter is missing", async () => {
    vi.mocked(loadVotes).mockRejectedValue(new Error("Invalid story ids")); const response = await GET(new Request("http://localhost/api/votes"));
    expect(loadVotes).toHaveBeenCalledWith([]); expect(response.status).toBe(503);
  });
  it("returns a retryable error without exposing backend details", async () => {
    vi.mocked(loadVotes).mockRejectedValue(new Error("secret details")); const response = await GET(new Request("http://localhost/api/votes?ids=123"));
    expect(response.status).toBe(503); expect(await response.json()).toEqual({ error: "Could not load votes" }); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
});
