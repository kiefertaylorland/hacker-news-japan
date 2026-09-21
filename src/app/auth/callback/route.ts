import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AUTH_ERROR_PATH } from "@/lib/auth/constants";
import { resolveRedirectOrigin, sanitizeNextPath } from "@/lib/auth/origin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${resolveRedirectOrigin(request.headers, origin)}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}${AUTH_ERROR_PATH}`);
}
