import { describe, expect, it } from "vitest";
import { getDomain, getStoryUrl, hnItemUrl } from "@/lib/url";

describe("url helpers", () => {
  it("builds the Hacker News item url", () => {
    expect(hnItemUrl("123")).toBe("https://news.ycombinator.com/item?id=123");
  });

  it("extracts a bare domain", () => {
    expect(getDomain("https://www.example.com/path")).toBe("example.com");
    expect(getDomain(null)).toBe("");
    expect(getDomain("notaurl")).toBe("");
  });

  it.each([
    ["https://example.com/post", "https://example.com/post"],
    ["http://example.com/post", "http://example.com/post"],
    ["javascript:alert(1)", "fallback"],
    ["not-a-url", "fallback"],
    [null, "fallback"],
  ])("resolves %s to a safe story url", (input, expected) => {
    expect(getStoryUrl(input, "fallback")).toBe(expected);
  });
});
