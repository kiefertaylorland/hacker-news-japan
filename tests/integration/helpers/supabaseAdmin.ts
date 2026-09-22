import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client for fixture setup/teardown (bypasses RLS). Server-only,
 * used exclusively by integration tests — never imported by app code.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
