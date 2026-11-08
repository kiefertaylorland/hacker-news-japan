import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs/config", () => ({ withSentryConfig: (config: unknown) => config }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function headersFor(environment: "production" | "development") {
  vi.stubEnv("NODE_ENV", environment);
  const { default: config } = await import("../../next.config");
  const rules = await config.headers!();
  expect(rules).toHaveLength(1);
  expect(rules[0].source).toBe("/:path*");
  return Object.fromEntries(rules[0].headers.map(({ key, value }) => [key, value]));
}

describe("global security headers", () => {
  it("prevents framing and disables unused sensitive browser features", async () => {
    expect(await headersFor("production")).toMatchObject({
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    });
  });

  it("restricts production content while supporting prerendering and telemetry", async () => {
    const headers = await headersFor("production");
    const csp = headers["Content-Security-Policy"];
    expect(csp).toBeDefined();
    const directives = Object.fromEntries(csp.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    }));
    expect(directives).toMatchObject({
      "default-src": ["'self'"],
      "script-src": ["'self'", "'unsafe-inline'", "https://va.vercel-scripts.com"],
      "script-src-attr": ["'none'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "frame-ancestors": ["'none'"],
      "worker-src": ["'self'", "blob:"],
      "upgrade-insecure-requests": [],
    });
    expect(directives["img-src"]).toContain("https://avatars.githubusercontent.com");
    expect(directives["connect-src"]).toContain("https://hn.algolia.com");
    expect(directives["connect-src"]).toContain("https://*.ingest.us.sentry.io");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toMatch(/[\r\n]/);
  });

  it("allows development debugging and hot reload without upgrading local HTTP", async () => {
    const headers = await headersFor("development");
    expect(headers["Content-Security-Policy"]).toContain("'unsafe-eval'");
    expect(headers["Content-Security-Policy"]).toContain("ws:");
    expect(headers["Content-Security-Policy"]).not.toContain("upgrade-insecure-requests");
  });

  it("allows OAuth form redirects through the configured Supabase origin and GitHub", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://auth.example.com");
    const headers = await headersFor("production");
    expect(headers["Content-Security-Policy"]).toContain("form-action 'self' https://auth.example.com https://github.com");
  });
});
