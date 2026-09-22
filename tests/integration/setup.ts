const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !publishableKey || !serviceRoleKey) {
  throw new Error(
    "Integration tests need a running local Supabase instance. Run `supabase start` " +
      "and export NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and " +
      "SUPABASE_SERVICE_ROLE_KEY from its output (see `supabase status -o env`)."
  );
}

// These tests create and delete real auth.users/bookmarks rows via a
// service-role client. Never let that run against anything but a local
// instance, however these env vars happen to get set.
const isLocalUrl = /^https?:\/\/(?:127\.0\.0\.1|localhost)(?::\d+)?(?:\/|$)/.test(url);
if (!isLocalUrl) {
  throw new Error(
    `Refusing to run integration tests against a non-local Supabase URL: ${url}`
  );
}
