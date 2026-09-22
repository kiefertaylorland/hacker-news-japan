/**
 * Guards suites that create and delete real auth.users/bookmarks rows via a
 * service-role client: the env must be set, and must point at a local instance,
 * however these env vars happen to get set.
 */
export function assertLocalSupabaseEnv(suite: string, runHint: string): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !publishableKey || !serviceRoleKey) {
    throw new Error(
      `${suite} need a running local Supabase instance. ${runHint} ` +
        "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and " +
        "SUPABASE_SERVICE_ROLE_KEY must come from its output (see `supabase status -o env`)."
    );
  }

  const isLocalUrl = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/.test(url);
  if (!isLocalUrl) {
    throw new Error(`Refusing to run ${suite.toLowerCase()} against a non-local Supabase URL: ${url}`);
  }
}
