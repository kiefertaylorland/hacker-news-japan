import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRequestOrigin, sanitizeNextPath } from "@/lib/auth/origin";

const headerValues = new Map<string, string>();

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: (name: string) => headerValues.get(name) ?? null })),
}));

beforeEach(() => {
  headerValues.clear();
});

describe("getRequestOrigin", () => {
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
});

describe("sanitizeNextPath", () => {
  it("only allows same-origin relative next paths", () => {
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath("https://evil.example")).toBe("/");
    expect(sanitizeNextPath("//evil.example")).toBe("/");
    expect(sanitizeNextPath("/\\evil.example")).toBe("/");
    expect(sanitizeNextPath("/saved")).toBe("/saved");
  });
});
