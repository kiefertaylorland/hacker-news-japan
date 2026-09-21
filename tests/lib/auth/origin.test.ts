import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRequestOrigin, resolveRedirectOrigin, sanitizeNextPath } from "@/lib/auth/origin";

const headerValues = vi.hoisted(() => new Map<string, string>());

vi.mock("next/headers", () => import("../../helpers/mockNext").then((m) => m.headersMock(headerValues)));

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

  it("uses the forwarded proto header even when it differs from the host-based fallback", async () => {
    headerValues.set("host", "example.com");
    headerValues.set("x-forwarded-proto", "http");
    expect(await getRequestOrigin()).toBe("http://example.com");
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

describe("resolveRedirectOrigin", () => {
  const fallback = "http://localhost:3000";
  const proxied = new Headers({ "x-forwarded-host": "hnj.vercel.app" });

  it("uses the forwarded host over https outside development", () => {
    expect(resolveRedirectOrigin(proxied, fallback)).toBe("https://hnj.vercel.app");
  });

  it("ignores the forwarded host in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(resolveRedirectOrigin(proxied, fallback)).toBe(fallback);
    vi.stubEnv("NODE_ENV", "test");
  });

  it("falls back to the request origin without a forwarded host", () => {
    expect(resolveRedirectOrigin(new Headers(), fallback)).toBe(fallback);
  });
});
