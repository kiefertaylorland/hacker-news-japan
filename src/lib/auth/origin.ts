import { headers } from "next/headers";

/** Resolves the public origin of the current request, honouring proxies (Vercel). */
export async function getRequestOrigin(): Promise<string> {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "localhost:3000";
  const proto =
    headerStore.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Only allows same-origin relative paths for post-login redirects. */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}
