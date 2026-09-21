import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface UserMetadataClaims {
  user_name?: string;
  preferred_username?: string;
  full_name?: string;
  name?: string;
  avatar_url?: string;
}

/** Memoized per request: the proxy already verified the session, so verify the claims once here. */
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const metadata = (claims.user_metadata ?? {}) as UserMetadataClaims;
  const name =
    metadata.user_name ||
    metadata.preferred_username ||
    metadata.full_name ||
    metadata.name ||
    (typeof claims.email === "string" ? claims.email : "") ||
    "Signed in";

  return {
    id: claims.sub,
    name,
    avatarUrl: metadata.avatar_url ?? null,
  };
});
