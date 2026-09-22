-- One-time, non-transactional setup for `supabase test db`.
-- Runs first (000- prefix) so its effects (extension, schema, helper functions)
-- persist for every later file in the same test run.

create extension if not exists pgtap with schema extensions;

-- `pg_prove` requires valid TAP output (a plan with at least one assertion)
-- from every file, so this counts itself as a single trivial test rather
-- than wrapping in begin/rollback (which would discard the setup before
-- later files in the same run could see it).
select plan(1);

create schema if not exists tests;

-- Creates a minimal confirmed auth.users row and returns its id, so RLS tests
-- can impersonate a "real" authenticated user without going through GitHub OAuth.
create or replace function tests.create_supabase_user(
  user_email text,
  user_password text default 'testpassword123'
) returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_user_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  );

  return new_user_id;
end;
$$;

-- Sets the same GUCs PostgREST sets per-request, so `auth.uid()` resolves to
-- `user_id` inside the current transaction, as if that user made the request.
-- Not `security definer`: switching the `role` GUC is disallowed inside a
-- security-definer function, and the caller (postgres, in tests) is already
-- granted membership in `anon`/`authenticated` so no elevation is needed.
create or replace function tests.authenticate_as(user_id uuid) returns void
language plpgsql
set search_path = public, auth, extensions
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_id::text, 'role', 'authenticated')::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Reverts to the anonymous role, as an unauthenticated request would have.
create or replace function tests.clear_authentication() returns void
language plpgsql
set search_path = public, auth, extensions
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- Once a test switches to `anon`/`authenticated`, it still needs to be able
-- to switch users again or clear auth. Only those helpers are granted: the
-- security-definer user factory stays callable by the test runner alone.
revoke execute on function tests.create_supabase_user(text, text) from public, anon, authenticated;
grant usage on schema tests to anon, authenticated;
grant execute on function tests.authenticate_as(uuid), tests.clear_authentication() to anon, authenticated;

select pass('pgtap test harness bootstrapped');

select * from finish();
