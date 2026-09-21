import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./supabaseAdmin";

export interface TestUser {
  id: string;
  email: string;
}

const TEST_PASSWORD = "integration-test-password-123";

/** Creates a real, confirmed auth user via the service-role admin API. */
export async function createTestUser(): Promise<TestUser> {
  const email = `integration-test-${crypto.randomUUID()}@example.com`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }
  return { id: data.user.id, email };
}

export async function deleteTestUser(userId: string): Promise<void> {
  await supabaseAdmin.auth.admin.deleteUser(userId);
}

/**
 * Signs in as a real user against local GoTrue and returns a supabase-js
 * client carrying that user's real session — the object substituted for
 * the app's `createClient()` in integration tests, so RLS is enforced by
 * the real database, not a mock.
 */
export async function clientAsUser(user: TestUser): Promise<SupabaseClient> {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
  const { error } = await client.auth.signInWithPassword({
    email: user.email,
    password: TEST_PASSWORD,
  });
  if (error) {
    throw new Error(`Failed to sign in as ${user.email}: ${error.message}`);
  }
  return client;
}

/** An anonymous (unauthenticated) client, for asserting RLS blocks anon access. */
export function anonClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
