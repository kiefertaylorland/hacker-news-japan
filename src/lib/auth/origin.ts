import { headers } from "next/headers";

type HeaderReader = { get(name: string): string | null };

/** Resolves the public origin of the current request, honouring proxies (Vercel). */
export async function getRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto =
    headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Origin to redirect to after OAuth: the proxied public host when one is present
 * (except in development, where the proxy host would point away from localhost),
 * otherwise the request's own origin.
 */
export function resolveRedirectOrigin(requestHeaders: HeaderReader, fallbackOrigin: string): string {
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  if (forwardedHost && process.env.NODE_ENV !== "development") {
    const proto = requestHeaders.get("x-forwarded-proto") ?? "https";
    return `${proto}://${forwardedHost}`;
  }
  return fallbackOrigin;
}

/** Only allows same-origin relative paths for post-login redirects. */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/";
  return next;
}
